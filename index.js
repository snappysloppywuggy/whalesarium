/**
 * Host half of the complex-words bundle.
 *
 * The Client half renders the highlights, the definition pane and the word bank.
 * Its only Host need is a definition for a word that is not in the built-in
 * glossary: this half registers one HTTP route, asks the model the session is
 * already configured with, and answers with a small JSON record. The Client
 * stores that record in its own word bank, so each word costs one call per
 * language and everything after that is instant and free.
 *
 * The route is registered on the Web carrier's `webServer` service, which is
 * the same origin the page is served from. When the profile has no Web carrier
 * (a terminal-only composition, for example) the plugin simply keeps working
 * without the route; the Client then reports that no definition is available.
 */

import { appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROUTE_PATH = '/complex-words/define'
const PING_PATH = '/complex-words/ping'
const MAX_BODY_BYTES = 64 * 1024
const MAX_TERM = 120
const MAX_CONTEXT = 400
const MAX_OUTPUT_CHARS = 1200

const LOG_PATH = fileURLToPath(new URL('host-boot.log', import.meta.url))

function bootLog(line) {
  try {
    appendFileSync(LOG_PATH, new Date().toISOString() + ' ' + line + '\n')
  } catch (error) {
    /* diagnostics must never break activation */
  }
}

const SYSTEM_PROMPT = [
  'You are a compact glossary for a software engineer.',
  'You answer with a single JSON object and nothing else: no prose, no code fence.',
].join(' ')

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': String(Buffer.byteLength(body)),
  })
  res.end(body)
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('payload too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (error) {
        reject(new Error('invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

const clean = (value, max) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''

function cleanList(value, max) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const item of value.slice(0, 3)) {
    const text = clean(item, max)
    if (text) out.push(text)
  }
  return out
}

/** Read the model route the session already uses, tolerating shape differences. */
function currentRoute(defaultModel, llm) {
  let selection
  try {
    selection = defaultModel ? defaultModel.currentSelection() : undefined
  } catch (error) {
    selection = undefined
  }
  const provider =
    (selection && (selection.provider || selection.providerId)) ||
    (llm && typeof llm.listProviders === 'function' ? (llm.listProviders()[0] || {}).id : undefined)
  const model =
    (selection && (selection.model || selection.modelId)) || (selection && selection.modelId)
  return { provider, model }
}

/**
 * Every language the Client can ask for. `name` is the English name used in the
 * prompt, `native` is the heading Wiktionary uses on that edition's pages.
 */
const LANGUAGES = {
  en: { name: 'English', native: 'English' },
  id: { name: 'Indonesian', native: 'Bahasa Indonesia' },
  ms: { name: 'Malay', native: 'Bahasa Melayu' },
  th: { name: 'Thai', native: 'ไทย' },
  vi: { name: 'Vietnamese', native: 'Tiếng Việt' },
  tl: { name: 'Filipino', native: 'Tagalog' },
  es: { name: 'Spanish', native: 'Español' },
  fr: { name: 'French', native: 'Français' },
  de: { name: 'German', native: 'Deutsch' },
  pt: { name: 'Portuguese', native: 'Português' },
  it: { name: 'Italian', native: 'Italiano' },
  nl: { name: 'Dutch', native: 'Nederlands' },
  ru: { name: 'Russian', native: 'Русский' },
  ja: { name: 'Japanese', native: '日本語' },
  zh: { name: 'Chinese', native: '中文' },
  ko: { name: 'Korean', native: '한국어' },
  ar: { name: 'Arabic', native: 'العربية' },
  hi: { name: 'Hindi', native: 'हिन्दी' },
  tr: { name: 'Turkish', native: 'Türkçe' },
  pl: { name: 'Polish', native: 'Polski' },
}

function languageInfo(code) {
  return LANGUAGES[code] || { name: 'English', native: 'English' }
}

function buildPrompt(term, context, lang) {
  const language = languageInfo(lang).name
  // The delimiters are the only structure in the prompt, so a value that
  // contains them could close the quote and continue as instructions.
  const guard = (value) => String(value || '').replace(/<<<|>>>/g, '·')
  const lines = [
    'Define the term delimited by triple angle brackets for a software engineer.',
    '<<< ' + guard(term) + ' >>>',
  ]
  if (context) lines.push('The user met it in this sentence: ' + JSON.stringify(guard(context)))
  lines.push(
    'Answer in ' + language + '.',
    'A word can carry several distinct senses, so give the senses separately.',
    'Order them so the sense that fits the quoted sentence comes first.',
    'Reply with exactly this JSON shape and nothing else:',
    '{"senses":[{"label":"two or three words naming the field or angle",',
    ' "definition":"two or three sentences","example":"one short example sentence"}],',
    ' "topic":"two or three words naming the field","kind":"term|product|name|phrase"}',
    'Give at most three senses, and only genuinely different meanings.',
    'An example must be concrete and must not repeat its definition.',
  )
  return lines.join('\n')
}

/** Flatten whatever shape the model produced into labelled senses. */
function normalizeSenses(parsed) {
  const out = []
  if (parsed && Array.isArray(parsed.senses)) {
    for (const sense of parsed.senses.slice(0, 3)) {
      const definition = clean(sense && sense.definition, 600)
      if (!definition) continue
      out.push({
        label: clean(sense.label, 40),
        definition,
        example: clean(sense.example, 240),
      })
    }
  }
  if (!out.length) {
    const definition = clean(parsed && parsed.definition, 700)
    if (definition) out.push({ label: '', definition, example: clean(parsed.example, 240) })
  }
  return out
}

function parseAnswer(text) {
  const source = String(text || '')
  const candidates = []
  const trimmed = source.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) candidates.push(trimmed)
  const start = source.indexOf('{')
  const end = source.lastIndexOf('}')
  if (start >= 0 && end > start) candidates.push(source.slice(start, end + 1))
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch (error) {
      /* try the next shape, then the field salvage below */
    }
  }
  return salvageAnswer(source)
}

/**
 * Last resort before failing the request. A long generation in a non-Latin
 * script often hits the token ceiling, which leaves valid fields but invalid
 * JSON; and occasionally the model simply answers in prose. Both are worth
 * showing, and neither is worth a 502.
 */
function coerceAnswer(text) {
  const parsed = parseAnswer(text)
  if (parsed) return parsed
  const source = String(text || '')
  // An attempted JSON object is not prose; only real prose is worth showing.
  if (source.includes('"senses"') || source.trim().startsWith('{')) return null
  const prose = source
    .replace(/```[a-z]*/gi, ' ')
    .replace(/^\s*(here('| i)s|sure\b|certainly\b)[^\n]*\n/i, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (prose.length < 24) return null
  return { definition: prose.slice(0, 700) }
}

/**
 * A truncated answer (the model hit its token ceiling) is still useful: pull the
 * fields that did arrive instead of discarding the whole call.
 */
function salvageAnswer(text) {
  const fieldOf = (name) => {
    const pattern = new RegExp('"' + name + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"')
    const match = pattern.exec(text)
    if (match) {
      try {
        return JSON.parse('"' + match[1] + '"')
      } catch (error) {
        return match[1]
      }
    }
    // An unterminated value is what truncation looks like: keep the fragment.
    const open = new RegExp('"' + name + '"\\s*:\\s*"([^"]*)').exec(text)
    return open ? open[1].trim() : ''
  }
  const definition = fieldOf('definition')
  if (!definition) return null
  return {
    definition,
    example: fieldOf('example'),
    usage: [],
    topic: fieldOf('topic'),
    kind: fieldOf('kind'),
  }
}

async function collectText(llm, route, prompt) {
  let text = ''
  const stream = llm.stream({
    provider: route.provider,
    model: route.model,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    maxTokens: 1400,
  })
  for await (const chunk of stream) {
    if (!chunk) continue
    if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
      text += chunk.text
      if (text.length > MAX_OUTPUT_CHARS * 3) break
    } else if (chunk.type === 'finish' && chunk.reason && chunk.reason.kind === 'error') {
      const failure = chunk.reason.failure
      const message = (failure && failure.message) || 'the model call failed'
      // A length truncation still leaves usable text; anything else is fatal.
      if (/incomplete|length|max.?tokens/i.test(message)) break
      throw new Error(message)
    }
  }
  return text
}

/* ------------------------------------------------------------- dictionaries
 * A free, fast path that runs before the model: the Wiktionary edition that
 * matches the requested language. Both editions are CC BY-SA 3.0, which the
 * Client credits in the panel. Coverage is genuinely a dictionary's coverage —
 * English jargon lives in the English edition, and the Indonesian edition only
 * carries words that entered Indonesian — so a miss falls through to the model.
 */

const DICTIONARY_TIMEOUT_MS = 5000
const USER_AGENT = 'dsh-complex-words/1.2 (local harness plugin)'
const ATTRIBUTION = 'Wiktionary, CC BY-SA 3.0'
/**
 * Any edition other than English is a general-language dictionary: for a
 * loanword such as "cache" it answers with the everyday sense, which is true and
 * misleading in a software context. Set this to false to send those lookups
 * straight to the model instead.
 */
const USE_LOCAL_DICTIONARIES = true

let dictionaryStats = { hit: 0, missed: 0, byLang: {} }

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
    signal: AbortSignal.timeout(DICTIONARY_TIMEOUT_MS),
  })
  if (!response.ok) return null
  return response.json().catch(() => null)
}

async function englishEntry(term) {
  const payload = await getJson('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(term))
  if (!payload) return null
  const section = payload.en || payload[Object.keys(payload)[0]]
  if (!Array.isArray(section) || !section.length) return null
  const parts = []
  let example = ''
  // A dictionary orders senses by etymology, not by usefulness, so several are
  // collected: the everyday sense of a technical word often comes second.
  for (const meaning of section) {
    for (const definition of meaning.definitions || []) {
      const text = stripHtml(definition.definition)
      if (text.length > 15 && parts.length < 3) parts.push(text)
      if (!example) {
        if (definition.parsedExample) example = stripHtml(definition.parsedExample)
        else if (Array.isArray(definition.examples) && definition.examples.length) {
          example = stripHtml(definition.examples[0].example)
        }
      }
    }
    if (parts.length >= 3 && example) break
  }
  if (!parts.length) return null
  dictionaryStats.hit += 1
  dictionaryStats.byLang.en = (dictionaryStats.byLang.en || 0) + 1
  const partOfSpeech = stripHtml(section[0].partOfSpeech)
  return {
    senses: parts.map((text, index) => ({
      label: partOfSpeech,
      definition: text,
      example: index === 0 ? example : '',
    })),
    example,
    topic: partOfSpeech,
  }
}

// Etymology notes, cross-references and inflection stubs read as definitions to
// a naive parser but say nothing about meaning.
const NOT_A_GLOSS =
  /^(dari bahasa|bahasa\s|borrowed|from\s|see\s|plural of|alternative form|alternative spelling|archaic form|obsolete form|synonym of|diminutive of|misspelling|rōmaji|romanization)/i

/** Templates that wrap a word without adding meaning; keep their payload. */
const KEEP_TEMPLATES = new Set(['plm', 'l', 'lien', 'm', 'link', 'w', 'mention', 'lang'])

function stripWiki(value) {
  let text = String(value || '')
  text = text.replace(/<ref[^>]*\/>/gi, ' ')
  text = text.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ')
  text = text.replace(/<!--[\s\S]*?-->/g, ' ')
  // Templates nest, so peel the innermost layer a few times.
  for (let pass = 0; pass < 6; pass += 1) {
    const next = text.replace(/\{\{([^{}]*)\}\}/g, (whole, body) => {
      const parts = String(body).split('|')
      const name = (parts[0] || '').trim().toLowerCase()
      if (KEEP_TEMPLATES.has(name) && parts.length > 1) return parts[parts.length - 1]
      return ' '
    })
    if (next === text) break
    text = next
  }
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1')
  text = text.replace(/'''?/g, '')
  text = text.replace(/&nbsp;|&thinsp;/gi, ' ')
  return text.replace(/\s+/g, ' ').replace(/^[\s:;,\-–—]+/, '').trim()
}

// "# gloss" on most editions, ":[1] gloss" on German, ";1 gloss" on Spanish.
const DEFINITION_LINE = /^(?:#(?![:*])|:\s*\[[^\]]+\]|;\s*\d+)\s*(.+)$/

/** Wiktionary section codes that differ from the language code we use. */
const CODE_ALIASES = {
  vi: ['vie'],
  zh: ['zho', 'cmn'],
  ms: ['msa', 'zsm'],
  tl: ['tgl'],
}

/** Marker lines such as {{-vie-}} only delimit a language when the code is one. */
const KNOWN_CODES = new Set(
  Object.keys(LANGUAGES).concat(...Object.values(CODE_ALIASES)),
)

function isLanguageMarker(line) {
  const match = /\{\{\s*-([a-z]{2,4})\s*-\s*\}\}/i.exec(line)
  return Boolean(match && KNOWN_CODES.has(match[1].toLowerCase()))
}

async function wiktionaryEntry(term, code) {
  const info = languageInfo(code)
  const url =
    'https://' + code + '.wiktionary.org/w/api.php?action=parse&prop=wikitext&format=json&redirects=1&page=' +
    encodeURIComponent(term)
  const payload = await getJson(url)
  const wikitext = payload && payload.parse && payload.parse.wikitext && payload.parse.wikitext['*']
  if (typeof wikitext !== 'string') return null

  // Pages stack one language per section, marked in one of two ways: a level-two
  // heading ("== Français ==", "== {{langue|fr}} ==") or a bare marker line
  // ("{{-vie-}}") as the Vietnamese and Russian editions do. Wiktionary's codes
  // are not always ours, so a few aliases are allowed.
  const lines = wikitext.split('\n')
  const heading = /^==[^=][^\n]*==\s*$/
  const codes = [code].concat(CODE_ALIASES[code] || [])
  const codeHit = new RegExp('\\|\\s*(?:' + codes.join('|') + ')\\s*[}|]', 'i')
  const markerHit = new RegExp('\\{\\{\\s*-\\s*(?:' + codes.join('|') + ')\\s*-\\s*\\}\\}', 'i')

  let start = -1
  let markerStyle = false
  for (let i = 0; i < lines.length; i += 1) {
    if (heading.test(lines[i])) {
      if (lines[i].includes(info.native) || codeHit.test(lines[i])) {
        start = i + 1
        break
      }
    } else if (markerHit.test(lines[i])) {
      start = i + 1
      markerStyle = true
      break
    }
  }
  if (start < 0) return null

  let end = lines.length
  for (let i = start; i < lines.length; i += 1) {
    if (heading.test(lines[i]) || (markerStyle && isLanguageMarker(lines[i]))) {
      end = i
      break
    }
  }

  const seen = new Set()
  const definitions = []
  for (let i = start; i < end; i += 1) {
    const match = DEFINITION_LINE.exec(lines[i])
    if (!match) continue
    const text = stripWiki(match[1])
    if (text.length < 4) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    definitions.push(text)
    if (definitions.length >= 3) break
  }
  if (!definitions.length) return null

  dictionaryStats.hit += 1
  dictionaryStats.byLang[code] = (dictionaryStats.byLang[code] || 0) + 1
  return {
    senses: definitions.map((text) => ({ label: '', definition: text, example: '' })),
    example: '',
    topic: '',
  }
}

async function lookupDictionary(term, lang) {
  if (lang !== 'en' && !USE_LOCAL_DICTIONARIES) {
    dictionaryStats.missed += 1
    return null
  }
  try {
    const entry = lang === 'en' ? await englishEntry(term) : await wiktionaryEntry(term, lang)
    if (entry) return entry
  } catch (error) {
    /* an unreachable dictionary is not a failure, only a miss */
  }
  dictionaryStats.missed += 1
  return null
}

export const inject = ['llm', 'webServer']

export function apply(ctx) {
  bootLog('apply: llm=' + typeof ctx.llm + ' webServer=' + typeof ctx.webServer)
  const llm = ctx.llm
  const webServer = ctx.webServer
  const defaultModel = ctx.get('agentDefaultModel')
  bootLog('resolved: defaultModel=' + Boolean(defaultModel))

  const handler = async (req, res) => {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'use POST' })
      return
    }
    let body
    try {
      body = await readJsonBody(req)
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : 'invalid request' })
      return
    }

    const term = clean(body && body.term, MAX_TERM)
    const context = clean(body && body.context, MAX_CONTEXT)
    const requested = String((body && body.lang) || 'en').toLowerCase()
    const lang = LANGUAGES[requested] ? requested : 'en'
    if (!term) {
      sendJson(res, 400, { error: 'term is required' })
      return
    }

    // Free, fast path first: the Wiktionary edition for the requested language.
    const dictionary = await lookupDictionary(term, lang)
    if (dictionary) {
      sendJson(res, 200, {
        definition: dictionary.senses[0].definition,
        example: dictionary.example || '',
        senses: dictionary.senses,
        usage: [],
        topic: dictionary.topic || '',
        kind: 'term',
        lang,
        source: 'dictionary',
        attribution: ATTRIBUTION,
      })
      return
    }

    const route = currentRoute(defaultModel, llm)
    if (!route.provider || !route.model) {
      sendJson(res, 503, { error: 'no model is selected for this session' })
      return
    }

    try {
      const raw = await collectText(llm, route, buildPrompt(term, context, lang))
      const parsed = coerceAnswer(raw)
      if (!parsed) {
        bootLog('parse failed for ' + lang + '/' + term + ' (' + raw.length + ' chars): ' + raw.slice(0, 300))
        sendJson(res, 502, { error: 'the model did not answer with JSON' })
        return
      }
      const definition = clean(parsed.definition, 700)
      const senses = normalizeSenses(parsed)
      if (!senses.length) {
        bootLog('no sense for ' + lang + '/' + term + ': ' + raw.slice(0, 300))
        sendJson(res, 502, { error: 'the model answered without a definition' })
        return
      }
      sendJson(res, 200, {
        definition: senses[0].definition,
        example: senses[0].example || clean(parsed.example, 240),
        senses,
        usage: cleanList(parsed.usage, 220),
        topic: clean(parsed.topic, 60),
        kind: clean(parsed.kind, 20) || 'term',
        lang,
        source: 'model',
        provider: route.provider,
        model: route.model,
      })
    } catch (error) {
      sendJson(res, 502, {
        error: error instanceof Error ? error.message : 'the model call failed',
      })
    }
  }

  // Diagnostic: proves the Host half loaded and reports the model route it
  // resolved. Costs nothing, because it never calls the model.
  const ping = (req, res) => {
    sendJson(res, 200, {
      ok: true,
      llm: typeof llm.stream === 'function',
      route: currentRoute(defaultModel, llm),
      dictionary: dictionaryStats,
    })
  }

  ctx.effect(() => {
    const offDefine = webServer.register({ kind: 'exact', path: ROUTE_PATH, handler })
    bootLog('registered ' + ROUTE_PATH)
    const offPing = webServer.register({ kind: 'exact', path: PING_PATH, handler: ping })
    bootLog('registered ' + PING_PATH)
    return () => {
      offDefine()
      offPing()
      bootLog('disposed both routes')
    }
  })
}

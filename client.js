/**
 * Complex Words — Client half.
 *
 * Three parts:
 *   1. a small bilingual lexicon (EN/ID) of technical terms and product names;
 *   2. a decorator that walks rendered conversation prose and rewrites matched
 *      words into <span class="cw-hl"> elements, so the highlight keeps the
 *      surrounding Markdown intact;
 *   3. `shell.overlay` entries that render the hover card, the right-click
 *      menu, a definition pane docked left of the conversation and the word
 *      bank docked in the right column.
 *
 * Everything the decorator adds carries `data-cw`, and the overlay carries
 * `data-cw-ui`, so a later pass never decorates its own output or the panels.
 */
window.__ModuleLoader__.load({
  id: '@local/complex-words',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    // ---------------------------------------------------------------- lexicon

    const s = (en, id) => ({ en, id })

    const TERMS = [
      {
        id: 'prompt',
        term: 'prompt',
        kind: 'term',
        aliases: ['prompts'],
        topic: s('AI assistants', 'Asisten AI'),
        short: s(
          'The text you hand a model as instructions.',
          'Teks yang kamu berikan ke model sebagai instruksi.',
        ),
        definition: s(
          'A prompt is the input a language model reads before it answers: a question, an instruction, or background material. Its wording, order, and length strongly shape the reply.',
          'Prompt adalah masukan yang dibaca model bahasa sebelum menjawab: pertanyaan, instruksi, atau bahan latar. Susunan kata, urutan, dan panjangnya sangat memengaruhi jawaban.',
        ),
        example: s(
          'Summarise this file in five bullet points.',
          'Ringkas berkas ini dalam lima poin.',
        ),
        usage: [
          s('A vague prompt usually produces a vague answer.', 'Prompt yang kabur biasanya menghasilkan jawaban yang kabur.'),
          s('Put the strictest constraints at the end of the prompt so the model reads them last.', 'Taruh batasan paling ketat di akhir prompt supaya dibaca model paling akhir.'),
        ],
        related: ['token', 'context-window', 'hallucination'],
      },
      {
        id: 'token',
        term: 'token',
        kind: 'term',
        aliases: ['tokens'],
        topic: s('AI assistants', 'Asisten AI'),
        short: s('The small text unit a model counts and bills.', 'Satuan teks kecil yang dihitung dan ditagih model.'),
        definition: s(
          'A token is a chunk of text, usually part of a word, that a model reads and produces. Models see tokens rather than characters, so limits such as the context window and most prices are counted in them.',
          'Token adalah potongan teks, biasanya sebagian kata, yang dibaca dan dihasilkan model. Model melihat token, bukan huruf, sehingga batas seperti context window dan sebagian besar harga dihitung dengan satuan ini.',
        ),
        example: s('A thousand English words is roughly 1,300 tokens.', 'Seribu kata bahasa Inggris kira-kira 1.300 token.'),
        usage: [
          s('Long answers cost more tokens than long questions.', 'Jawaban panjang memakan token lebih banyak daripada pertanyaan panjang.'),
          s('The tool truncated the file to stay inside the token budget.', 'Alat itu memotong berkas agar tetap di bawah anggaran token.'),
        ],
        related: ['context-window', 'prompt', 'quantization'],
      },
      {
        id: 'context-window',
        term: 'context window',
        kind: 'term',
        aliases: ['context windows'],
        topic: s('AI assistants', 'Asisten AI'),
        short: s('How much text a model can hold at once.', 'Seberapa banyak teks yang bisa ditampung model sekaligus.'),
        definition: s(
          'The context window is the maximum number of tokens a model can consider in one request, counting the system prompt, the conversation so far, and the answer as it is written. Once it is full, the oldest material is dropped or summarised.',
          'Context window adalah jumlah maksimum token yang bisa dipertimbangkan model dalam satu permintaan, mencakup system prompt, percakapan sejauh ini, dan jawaban yang sedang ditulis. Begitu penuh, materi tertua dibuang atau diringkas.',
        ),
        example: s('The whole conversation no longer fits in the context window.', 'Seluruh percakapan sudah tidak muat di context window.'),
        usage: [
          s('A bigger context window costs more per request even when unused.', 'Context window yang lebih besar menaikkan biaya per permintaan meski tidak terpakai.'),
          s('Older turns fall out of the context window as the session grows.', 'Giliran percakapan yang lama keluar dari context window saat sesi memanjang.'),
        ],
        related: ['token', 'prompt', 'rag'],
      },
      {
        id: 'inference',
        term: 'inference',
        kind: 'term',
        topic: s('AI assistants', 'Asisten AI'),
        short: s('Running a trained model to get an answer.', 'Menjalankan model terlatih untuk mendapat jawaban.'),
        definition: s(
          'Inference is the step where a trained model produces output for new input, as opposed to training, which adjusts its weights. Every message you send triggers inference.',
          'Inference adalah tahap ketika model terlatih menghasilkan keluaran untuk masukan baru, berbeda dari training yang menyesuaikan bobotnya. Setiap pesan yang kamu kirim memicu inference.',
        ),
        example: s('Local inference keeps the prompt on your own machine.', 'Inference lokal menjaga prompt tetap di mesinmu sendiri.'),
        usage: [
          s('Inference cost dominates the bill once training is done.', 'Setelah pelatihan selesai, biaya inference mendominasi tagihan.'),
          s('The scheduler batches inference requests to keep the GPU busy.', 'Penjadwal mengelompokkan permintaan inference agar GPU tetap sibuk.'),
        ],
        related: ['latency', 'quantization', 'token'],
      },
      {
        id: 'embedding',
        term: 'embedding',
        kind: 'term',
        aliases: ['embeddings'],
        topic: s('AI assistants', 'Asisten AI'),
        short: s('A list of numbers that encodes meaning.', 'Deretan angka yang mengodekan makna.'),
        definition: s(
          'An embedding turns text into a vector of numbers so that similar meanings sit close together in that space. Search and retrieval systems compare these vectors instead of matching words literally.',
          'Embedding mengubah teks menjadi vektor angka sehingga makna yang mirip berdekatan di ruang itu. Sistem pencarian dan retrieval membandingkan vektor ini alih-alih mencocokkan kata secara harfiah.',
        ),
        example: s('The store keeps one embedding per document.', 'Penyimpanan itu menyimpan satu embedding per dokumen.'),
        usage: [
          s('Two phrasings of the same question produce close embeddings.', 'Dua susunan kata untuk pertanyaan yang sama menghasilkan embedding berdekatan.'),
          s('Rebuild the embeddings after changing the model.', 'Bangun ulang embedding setelah mengganti model.'),
        ],
        related: ['vector-database', 'rag', 'token'],
      },
      {
        id: 'fine-tuning',
        term: 'fine-tuning',
        kind: 'term',
        aliases: ['fine tune', 'fine-tune', 'fine tuned'],
        topic: s('AI assistants', 'Asisten AI'),
        short: s('Further training on your own examples.', 'Melatih ulang dengan contoh milikmu sendiri.'),
        definition: s(
          'Fine-tuning continues training a finished model on a small, targeted dataset so it holds a house style or handles a narrow task better. It is not the same as adding knowledge through retrieved documents.',
          'Fine-tuning melanjutkan pelatihan model yang sudah jadi dengan kumpulan data kecil dan spesifik agar gaya jawabannya konsisten atau tugas sempitnya tertangani lebih baik. Ini berbeda dari menambah pengetahuan lewat dokumen yang diambil saat menjawab.',
        ),
        example: s('Fine-tuning fixed the tone but not the missing facts.', 'Fine-tuning memperbaiki nada bicara, tetapi tidak melengkapi fakta yang hilang.'),
        usage: [
          s('Fine-tuning needs a few hundred clean examples at minimum.', 'Fine-tuning butuh setidaknya beberapa ratus contoh yang bersih.'),
          s('Try prompting first, then fine-tuning if the style still drifts.', 'Coba prompting dulu, baru fine-tuning bila gayanya masih melenceng.'),
        ],
        related: ['prompt', 'rag', 'checkpoint'],
      },
      {
        id: 'rag',
        term: 'RAG',
        kind: 'term',
        caseSensitive: true,
        aliases: ['retrieval-augmented generation', 'Retrieval-augmented generation'],
        topic: s('AI assistants', 'Asisten AI'),
        short: s('Answering from documents fetched on demand.', 'Menjawab dari dokumen yang diambil saat itu juga.'),
        definition: s(
          'Retrieval-augmented generation pairs a model with a search step: relevant documents are fetched first and pasted into the prompt, so the answer can cite current or private material the model was never trained on.',
          'Retrieval-augmented generation memadukan model dengan langkah pencarian: dokumen relevan diambil lebih dulu lalu disisipkan ke prompt, sehingga jawaban bisa merujuk materi terbaru atau internal yang tidak pernah dilatihkan ke model.',
        ),
        example: s('RAG keeps the answer grounded in this repository.', 'RAG menjaga jawaban tetap berpijak pada repositori ini.'),
        usage: [
          s('RAG fails quietly when the retrieval step returns nothing useful.', 'RAG gagal tanpa suara ketika langkah retrieval tidak mengembalikan apa pun yang berguna.'),
          s('Chunk size decides what RAG can and cannot find.', 'Ukuran potongan menentukan apa yang bisa dan tidak bisa ditemukan RAG.'),
        ],
        related: ['embedding', 'vector-database', 'hallucination'],
      },
      {
        id: 'hallucination',
        term: 'hallucination',
        kind: 'term',
        aliases: ['hallucinations', 'hallucinate', 'hallucinated'],
        topic: s('AI assistants', 'Asisten AI'),
        short: s('A confident answer that is not true.', 'Jawaban yang terdengar yakin tetapi tidak benar.'),
        definition: s(
          'A hallucination is model output that reads like fact but was invented, such as a citation that does not exist or a function that was never written. Fluent wording is never evidence of correctness.',
          'Halusinasi adalah keluaran model yang terbaca seperti fakta tetapi dikarang, misalnya sitasi yang tidak ada atau fungsi yang tidak pernah ditulis. Kata-kata yang lancar bukan bukti kebenaran.',
        ),
        example: s('That package never existed; the model hallucinated it.', 'Paket itu tidak pernah ada; model menghalusinasikannya.'),
        usage: [
          s('Check every path a model claims to have read.', 'Periksa setiap path yang diklaim model sudah dibaca.'),
          s('Grounding with RAG reduces hallucination but does not remove it.', 'Berpijak pada RAG mengurangi halusinasi, tetapi tidak menghilangkannya.'),
        ],
        related: ['rag', 'prompt', 'inference'],
      },
      {
        id: 'latency',
        term: 'latency',
        kind: 'term',
        topic: s('Performance', 'Kinerja'),
        short: s('The delay before a reply arrives.', 'Jeda sebelum balasan tiba.'),
        definition: s(
          'Latency is elapsed time from request to response, usually measured to the first token and to the last. It is separate from throughput, which counts how many requests are handled at the same time.',
          'Latency adalah waktu dari permintaan sampai balasan, biasanya diukur ke token pertama dan ke token terakhir. Ini berbeda dari throughput yang menghitung berapa banyak permintaan ditangani bersamaan.',
        ),
        example: s('Caching the lookup cut latency in half.', 'Meng-cache pencarian itu memotong latency menjadi separuh.'),
        usage: [
          s('Streaming improves perceived latency without changing total time.', 'Streaming memperbaiki latency yang dirasakan tanpa mengubah total waktu.'),
          s('The median latency is fine; the tail is what users notice.', 'Latency median baik-baik saja; ekornya yang dirasakan pengguna.'),
        ],
        related: ['inference', 'cache', 'rate-limit'],
      },
      {
        id: 'api',
        term: 'API',
        kind: 'term',
        caseSensitive: true,
        aliases: ['APIs'],
        topic: s('Software engineering', 'Rekayasa perangkat lunak'),
        short: s('The contract one program calls through.', 'Kontrak yang dipakai satu program untuk memanggil yang lain.'),
        definition: s(
          'An API is the agreed set of functions, inputs, and outputs that lets one piece of software use another without knowing its internals. Changing it breaks callers, so versions are announced in advance.',
          'API adalah kumpulan fungsi, masukan, dan keluaran yang disepakati agar satu perangkat lunak bisa memakai yang lain tanpa tahu isinya. Mengubahnya merusak pemanggil, karena itu versinya diumumkan lebih dulu.',
        ),
        example: s('The handler calls the search API and returns its result.', 'Penangan itu memanggil API pencarian lalu mengembalikan hasilnya.'),
        usage: [
          s('Pin the API version so a silent change cannot break the build.', 'Sematkan versi API agar perubahan senyap tidak merusak build.'),
          s('The API accepts a maximum of one hundred rows per call.', 'API itu menerima paling banyak seratus baris per panggilan.'),
        ],
        related: ['endpoint', 'sdk', 'rate-limit'],
      },
      {
        id: 'endpoint',
        term: 'endpoint',
        kind: 'term',
        aliases: ['endpoints'],
        topic: s('Software engineering', 'Rekayasa perangkat lunak'),
        short: s('One addressable operation in an API.', 'Satu operasi yang bisa dialamatkan di sebuah API.'),
        definition: s(
          'An endpoint is a single URL plus method that an API exposes, such as POST /sessions. Each one has its own request shape, response shape, and error behaviour.',
          'Endpoint adalah satu URL beserta metode yang disediakan API, misalnya POST /sessions. Tiap endpoint punya bentuk permintaan, bentuk balasan, dan perilaku galat sendiri.',
        ),
        example: s('The retry hit the same endpoint twice.', 'Percobaan ulang menghantam endpoint yang sama dua kali.'),
        usage: [
          s('Added a health endpoint that answers without touching the database.', 'Menambahkan endpoint kesehatan yang menjawab tanpa menyentuh basis data.'),
          s('That endpoint streams; it does not return one JSON body.', 'Endpoint itu melakukan streaming; ia tidak mengembalikan satu badan JSON.'),
        ],
        related: ['api', 'webhook', 'middleware'],
      },
      {
        id: 'sdk',
        term: 'SDK',
        kind: 'term',
        caseSensitive: true,
        topic: s('Software engineering', 'Rekayasa perangkat lunak'),
        short: s('A ready-made library for calling an API.', 'Pustaka siap pakai untuk memanggil sebuah API.'),
        definition: s(
          'A software development kit wraps an API in ordinary function calls for one language and handles authentication, retries, and data shapes. It is convenience on top of the service, not a separate service.',
          'SDK membungkus sebuah API menjadi pemanggilan fungsi biasa untuk satu bahasa, sekaligus menangani autentikasi, percobaan ulang, dan bentuk data. Ia kemudahan di atas layanan, bukan layanan tersendiri.',
        ),
        example: s('Install the SDK instead of hand-writing the HTTP calls.', 'Pasang SDK alih-alih menulis sendiri panggilan HTTP-nya.'),
        usage: [
          s('The SDK hides the pagination behind an async iterator.', 'SDK menyembunyikan paginasi di balik async iterator.'),
          s('An outdated SDK can send fields the service no longer accepts.', 'SDK yang usang bisa mengirim bidang yang tak lagi diterima layanan.'),
        ],
        related: ['api', 'endpoint', 'cli'],
      },
      {
        id: 'cli',
        term: 'CLI',
        kind: 'term',
        caseSensitive: true,
        topic: s('Software engineering', 'Rekayasa perangkat lunak'),
        short: s('A program driven by typed commands.', 'Program yang dijalankan dengan mengetik perintah.'),
        definition: s(
          'A command-line interface exposes a tool as text commands instead of a window. It suits repeatable steps, scripts, and remote machines, and it composes with pipes.',
          'CLI memperlihatkan sebuah alat sebagai perintah teks alih-alih jendela. Cocok untuk langkah berulang, skrip, dan mesin jarak jauh, serta mudah dirangkai dengan pipe.',
        ),
        example: s('The CLI prints the composed config without starting a server.', 'CLI mencetak konfigurasi hasil gabungan tanpa menjalankan server.'),
        usage: [
          s('The CLI is the only interface available over SSH.', 'CLI satu-satunya antarmuka yang tersedia lewat SSH.'),
          s('Pass the flag through the CLI rather than editing the file.', 'Lewatkan flag itu lewat CLI daripada menyunting berkasnya.'),
        ],
        related: ['sdk', 'runtime', 'plugin'],
      },
      {
        id: 'runtime',
        term: 'runtime',
        kind: 'term',
        topic: s('Software engineering', 'Rekayasa perangkat lunak'),
        short: s('The environment that executes code.', 'Lingkungan yang menjalankan kode.'),
        definition: s(
          'A runtime is what actually executes a program: the interpreter or engine plus its built-in libraries. The same source can behave differently on two runtimes.',
          'Runtime adalah yang benar-benar menjalankan program: interpreter atau engine beserta pustaka bawaannya. Sumber yang sama bisa berperilaku berbeda di dua runtime.',
        ),
        example: s('This function exists only in the browser runtime.', 'Fungsi ini hanya ada di runtime peramban.'),
        usage: [
          s('A runtime error means the code compiled but failed while running.', 'Galat runtime berarti kode terkompilasi tetapi gagal saat berjalan.'),
          s('Ship the runtime with the plugin so users need no install step.', 'Bawa runtime bersama plugin agar pengguna tidak perlu memasang apa pun.'),
        ],
        related: ['framework', 'cli', 'sandbox'],
      },
      {
        id: 'framework',
        term: 'framework',
        kind: 'term',
        topic: s('Software engineering', 'Rekayasa perangkat lunak'),
        short: s('Skeleton code that calls yours.', 'Kerangka kode yang memanggil kode milikmu.'),
        definition: s(
          'A framework supplies structure and decides when your code runs, the way a router decides which page component to mount. A library is the opposite: you stay in control and call it.',
          'Framework menyediakan struktur dan menentukan kapan kodemu berjalan, seperti router yang memilih komponen halaman untuk dipasang. Pustaka kebalikannya: kamu yang memegang kendali dan memanggilnya.',
        ),
        example: s('The framework re-renders the list after the state changes.', 'Framework menggambar ulang daftar setelah state berubah.'),
        usage: [
          s('Migrating a framework is not a refactor; it changes the shape of every file.', 'Migrasi framework bukan refactor; ia mengubah bentuk setiap berkas.'),
          s('Prefer the framework conventions over one-off helpers.', 'Utamakan konvensi framework daripada pembantu sekali pakai.'),
        ],
        related: ['runtime', 'dependency', 'react'],
      },
      {
        id: 'refactor',
        term: 'refactor',
        kind: 'term',
        aliases: ['refactoring', 'refactored'],
        topic: s('Software engineering', 'Rekayasa perangkat lunak'),
        short: s('Restructuring code without changing behaviour.', 'Menata ulang kode tanpa mengubah perilakunya.'),
        definition: s(
          'A refactor changes how code is organised, not what it does, so the existing tests must keep passing. Mixing a refactor with a behaviour change makes a regression hard to locate.',
          'Refactor mengubah susunan kode, bukan perilakunya, sehingga tes yang ada harus tetap lolos. Mencampur refactor dengan perubahan perilaku membuat regresi sulit dilacak.',
        ),
        example: s('Split the handler first, then fix the bug in a separate change.', 'Pecah penangan itu dulu, lalu perbaiki bug di perubahan terpisah.'),
        usage: [
          s('A refactor with no test coverage is a rewrite in disguise.', 'Refactor tanpa cakupan tes adalah penulisan ulang terselubung.'),
          s('Keep the refactor mechanical so review stays fast.', 'Jaga refactor tetap mekanis agar peninjauan cepat.'),
        ],
        related: ['repository', 'commit', 'dependency'],
      },
      {
        id: 'repository',
        term: 'repository',
        kind: 'term',
        aliases: ['repositories', 'repo', 'repos'],
        topic: s('Software engineering', 'Rekayasa perangkat lunak'),
        short: s('The tracked history of a project.', 'Riwayat proyek yang dilacak versinya.'),
        definition: s(
          'A repository holds a project files together with the full history of commits, branches, and tags. Cloning copies that history, not just the current files.',
          'Repositori menyimpan berkas proyek beserta seluruh riwayat commit, branch, dan tag. Mengklon menyalin riwayat itu, bukan hanya berkas terkini.',
        ),
        example: s('The repository has no changes on the main branch.', 'Repositori tidak punya perubahan di branch main.'),
        usage: [
          s('Search the repository before assuming the helper does not exist.', 'Cari di repositori sebelum menganggap pembantu itu tidak ada.'),
          s('The repository is large, so shallow clones are the default here.', 'Repositori itu besar, jadi klon dangkal menjadi bawaan di sini.'),
        ],
        related: ['commit', 'github', 'refactor'],
      },
      {
        id: 'commit',
        term: 'commit',
        kind: 'term',
        aliases: ['commits', 'committed'],
        topic: s('Software engineering', 'Rekayasa perangkat lunak'),
        short: s('One recorded change set in the history.', 'Satu catatan perubahan di riwayat.'),
        definition: s(
          'A commit is a snapshot of the tracked files plus a message and an author, identified by a hash. It is the unit you review, revert, and bisect through.',
          'Commit adalah potret berkas yang dilacak beserta pesan dan penulisnya, ditandai sebuah hash. Ia satuan yang ditinjau, dibatalkan, dan ditelusuri dengan bisect.',
        ),
        example: s('Squash the three fixes into one commit.', 'Gabungkan ketiga perbaikan menjadi satu commit.'),
        usage: [
          s('Write the commit message for the reader who arrives in a year.', 'Tulis pesan commit untuk pembaca yang datang setahun kemudian.'),
          s('Each commit should build and pass on its own.', 'Tiap commit sebaiknya bisa dibangun dan lolos tes sendiri.'),
        ],
        related: ['repository', 'migration', 'github'],
      },
      {
        id: 'deploy',
        term: 'deploy',
        kind: 'term',
        aliases: ['deployed', 'deployment', 'deploying'],
        topic: s('Software engineering', 'Rekayasa perangkat lunak'),
        short: s('Putting new code into the running environment.', 'Memasang kode baru ke lingkungan yang berjalan.'),
        definition: s(
          'Deploying moves a build from the pipeline into the place users reach it. A deploy can still fail after the build passed, for example on a missing secret or a failing health check.',
          'Deploy memindahkan hasil build dari pipeline ke tempat yang dijangkau pengguna. Deploy tetap bisa gagal setelah build lolos, misalnya karena secret yang hilang atau health check yang gagal.',
        ),
        example: s('Deploy during low traffic and watch the error rate.', 'Deploy saat lalu lintas rendah dan pantau laju galatnya.'),
        usage: [
          s('The deploy rolled back automatically when health checks failed.', 'Deploy dibatalkan otomatis ketika health check gagal.'),
          s('A deploy is not done until the new version answers traffic.', 'Deploy belum selesai sampai versi baru melayani lalu lintas.'),
        ],
        related: ['pipeline', 'migration', 'docker'],
      },
      {
        id: 'migration',
        term: 'migration',
        kind: 'term',
        aliases: ['migrations'],
        topic: s('Data', 'Data'),
        short: s('A planned change to stored data or schema.', 'Perubahan terencana pada data atau skema tersimpan.'),
        definition: s(
          'A migration rewrites stored structure, such as adding a column or moving rows, and must run in order on every environment. Old and new code usually overlap while it runs, so both shapes have to work.',
          'Migrasi menulis ulang struktur tersimpan, misalnya menambah kolom atau memindahkan baris, dan harus berjalan berurutan di setiap lingkungan. Kode lama dan baru biasanya hidup bersamaan selama proses, jadi kedua bentuk harus tetap jalan.',
        ),
        example: s('The migration backfills the new column before the code reads it.', 'Migrasi mengisi kolom baru sebelum kode membacanya.'),
        usage: [
          s('Write the migration so it can run twice without harm.', 'Tulis migrasi agar aman dijalankan dua kali.'),
          s('The migration locked the table for forty seconds.', 'Migrasi itu mengunci tabel selama empat puluh detik.'),
        ],
        related: ['schema', 'commit', 'deploy'],
      },
      {
        id: 'schema',
        term: 'schema',
        kind: 'term',
        aliases: ['schemas'],
        topic: s('Data', 'Data'),
        short: s('The declared shape of data.', 'Bentuk data yang dideklarasikan.'),
        definition: s(
          'A schema states which fields exist, their types, and which are required, so tools can validate input before it reaches your code. It is documentation that can be enforced.',
          'Skema menyatakan bidang apa yang ada, tipenya, dan mana yang wajib, sehingga alat bisa memvalidasi masukan sebelum sampai ke kodemu. Ia dokumentasi yang bisa ditegakkan.',
        ),
        example: s('The row was rejected because it did not match the schema.', 'Baris itu ditolak karena tidak cocok dengan skema.'),
        usage: [
          s('The published schema is the contract other teams code against.', 'Skema yang dipublikasikan adalah kontrak yang dipakai tim lain.'),
          s('Changing the schema without a version breaks stored rows.', 'Mengubah skema tanpa versi merusak baris yang tersimpan.'),
        ],
        related: ['migration', 'api', 'typescript'],
      },
      {
        id: 'cache',
        term: 'cache',
        kind: 'term',
        aliases: ['caches', 'cached', 'caching'],
        topic: s('Performance', 'Kinerja'),
        short: s('A fast copy kept to avoid repeated work.', 'Salinan cepat yang disimpan agar tak mengulang kerja.'),
        definition: s(
          'A cache stores a result close at hand so the next request skips the slow path. It buys speed with staleness, so every entry needs a lifetime or an invalidation rule.',
          'Cache menyimpan hasil di dekat pemakai agar permintaan berikutnya melewati jalur lambat. Ia menukar kecepatan dengan risiko data basi, karena itu setiap entri butuh masa berlaku atau aturan pembatalan.',
        ),
        example: s('Clear the cache after changing the template.', 'Bersihkan cache setelah mengubah templatnya.'),
        usage: [
          s('The cache is cold on the first request and warm afterwards.', 'Cache dingin pada permintaan pertama, lalu hangat sesudahnya.'),
          s('A cache keyed by path serves the wrong file after a rename.', 'Cache berkunci path menyajikan berkas yang salah setelah penggantian nama.'),
        ],
        related: ['latency', 'embedding', 'idempotent'],
      },
      {
        id: 'idempotent',
        term: 'idempotent',
        kind: 'term',
        aliases: ['idempotency'],
        topic: s('Performance', 'Kinerja'),
        short: s('Safe to repeat with the same effect.', 'Aman diulang dengan hasil yang sama.'),
        definition: s(
          'An operation is idempotent when running it twice leaves the same state as running it once. Automatic retries are only safe on operations with this property.',
          'Operasi bersifat idempotent bila menjalankannya dua kali menyisakan keadaan yang sama seperti sekali. Percobaan ulang otomatis hanya aman pada operasi bersifat ini.',
        ),
        example: s('Create the row with a client-supplied id so the retry stays idempotent.', 'Buat baris dengan id dari klien agar percobaan ulang tetap idempotent.'),
        usage: [
          s('DELETE is idempotent; POST usually is not.', 'DELETE bersifat idempotent; POST biasanya tidak.'),
          s('The queue redelivers, so every handler must be idempotent.', 'Antrean mengirim ulang, jadi setiap penangan harus idempotent.'),
        ],
        related: ['cache', 'webhook', 'endpoint'],
      },
      {
        id: 'middleware',
        term: 'middleware',
        kind: 'term',
        topic: s('Software engineering', 'Rekayasa perangkat lunak'),
        short: s('A layer that wraps each request.', 'Lapisan yang membungkus setiap permintaan.'),
        definition: s(
          'Middleware sits between the incoming request and the final handler, so logging, authentication, and error mapping are written once. Order matters, because each layer wraps the next one.',
          'Middleware berada antara permintaan masuk dan penangan akhir, sehingga logging, autentikasi, dan pemetaan galat ditulis sekali saja. Urutannya penting karena tiap lapisan membungkus lapisan berikutnya.',
        ),
        example: s('Register the auth middleware before the routes.', 'Daftarkan middleware autentikasi sebelum rutenya.'),
        usage: [
          s('The error middleware must be registered last.', 'Middleware galat harus didaftarkan paling akhir.'),
          s('A middleware that opens a transaction must close it on failure too.', 'Middleware yang membuka transaksi harus menutupnya juga saat gagal.'),
        ],
        related: ['endpoint', 'webhook', 'framework'],
      },
      {
        id: 'webhook',
        term: 'webhook',
        kind: 'term',
        aliases: ['webhooks'],
        topic: s('Software engineering', 'Rekayasa perangkat lunak'),
        short: s('An HTTP call another service makes to you.', 'Panggilan HTTP dari layanan lain ke kamu.'),
        definition: s(
          'A webhook is a request a third-party service sends to your URL when something happens, the reverse of polling for it. The receiver must verify the signature and answer quickly.',
          'Webhook adalah permintaan yang dikirim layanan pihak ketiga ke URL-mu saat terjadi sesuatu, kebalikan dari menanyakan berulang. Penerimanya harus memverifikasi tanda tangan dan menjawab dengan cepat.',
        ),
        example: s('The payment provider retries the webhook until it gets a 2xx.', 'Penyedia pembayaran mengulang webhook sampai mendapat 2xx.'),
        usage: [
          s('Acknowledge the webhook first and process it in the background.', 'Balas webhook lebih dulu, olah di latar belakang.'),
          s('Reject a webhook whose signature does not match the secret.', 'Tolak webhook yang tanda tangannya tidak cocok dengan secret.'),
        ],
        related: ['endpoint', 'idempotent', 'api'],
      },
      {
        id: 'sandbox',
        term: 'sandbox',
        kind: 'term',
        aliases: ['sandboxed'],
        topic: s('Security', 'Keamanan'),
        short: s('An isolated place to run untrusted work.', 'Tempat terisolasi untuk pekerjaan tak tepercaya.'),
        definition: s(
          'A sandbox limits what a program may read, write, or reach while it runs, so a mistake or an attack stays contained. The restrictions are enforced from outside the program itself.',
          'Sandbox membatasi apa yang boleh dibaca, ditulis, atau dijangkau program saat berjalan, sehingga kesalahan atau serangan tetap terkurung. Pembatasannya ditegakkan dari luar program itu sendiri.',
        ),
        example: s('The command runs in a sandbox with read-only access.', 'Perintah itu berjalan di sandbox dengan akses hanya-baca.'),
        usage: [
          s('A sandbox that blocks the network also blocks most exfiltration.', 'Sandbox yang memblokir jaringan sekaligus memblokir sebagian besar upaya pembocoran data.'),
          s('Ask for wider access only for the exact command you need.', 'Minta akses lebih luas hanya untuk perintah yang benar-benar kamu butuhkan.'),
        ],
        related: ['runtime', 'dependency', 'docker'],
      },
      {
        id: 'plugin',
        term: 'plugin',
        kind: 'term',
        aliases: ['plugins'],
        topic: s('Software engineering', 'Rekayasa perangkat lunak'),
        short: s('An add-on that extends a host program.', 'Tambahan yang memperluas program induknya.'),
        definition: s(
          'A plugin is loaded by a host and contributes behaviour the host decides how to use, such as a new menu, tool, or page. Its reach is limited to the extension points the host exposes.',
          'Plugin dimuat oleh program induk dan menyumbang perilaku yang induk tentukan pemakaiannya, misalnya menu, alat, atau halaman baru. Jangkauannya dibatasi titik ekstensi yang disediakan induk.',
        ),
        example: s('The plugin registers one row on the settings page.', 'Plugin itu mendaftarkan satu baris di halaman pengaturan.'),
        usage: [
          s('A plugin that writes outside its own slot breaks on the next update.', 'Plugin yang menulis di luar slot-nya rusak pada pembaruan berikutnya.'),
          s('Disable the plugin to confirm it causes the slowdown.', 'Nonaktifkan plugin untuk memastikan ia penyebab melambatnya.'),
        ],
        related: ['framework', 'runtime', 'dependency'],
      },
      {
        id: 'dependency',
        term: 'dependency',
        kind: 'term',
        aliases: ['dependencies'],
        topic: s('Software engineering', 'Rekayasa perangkat lunak'),
        short: s('A package your code needs to run.', 'Paket yang dibutuhkan kodemu untuk berjalan.'),
        definition: s(
          'A dependency is another package your project imports and therefore installs or ships. Transitive dependencies are the ones your dependencies pull in, and they hold most of the supply-chain risk.',
          'Dependensi adalah paket lain yang diimpor proyekmu sehingga ikut dipasang atau dimuat. Dependensi transitif adalah yang ditarik oleh dependensimu, dan di sanalah sebagian besar risiko rantai pasok berada.',
        ),
        example: s('Pin the dependency to a minor version range.', 'Sematkan dependensi pada rentang versi minor.'),
        usage: [
          s('Every new dependency is code you now have to trust.', 'Setiap dependensi baru adalah kode yang kini harus kamu percaya.'),
          s('The lockfile makes the dependency tree reproducible.', 'Lockfile membuat pohon dependensi bisa direproduksi.'),
        ],
        related: ['framework', 'plugin', 'repository'],
      },
      {
        id: 'pipeline',
        term: 'pipeline',
        kind: 'term',
        aliases: ['pipelines'],
        topic: s('Software engineering', 'Rekayasa perangkat lunak'),
        short: s('The ordered chain from input to output.', 'Rangkaian berurutan dari masukan ke keluaran.'),
        definition: s(
          'A pipeline is a sequence of steps where each stage hands its result to the next, such as lint, test, build, and deploy. A failure stops the chain and names the stage it broke in.',
          'Pipeline adalah rangkaian langkah di mana tiap tahap menyerahkan hasilnya ke tahap berikutnya, misalnya lint, test, build, dan deploy. Kegagalan menghentikan rangkaian dan menyebut tahap tempat ia putus.',
        ),
        example: s('The pipeline stops after the failing test step.', 'Pipeline berhenti setelah langkah tes yang gagal.'),
        usage: [
          s('Run the slow steps only when the fast ones pass.', 'Jalankan langkah lambat hanya setelah yang cepat lolos.'),
          s('A flaky test makes the whole pipeline untrustworthy.', 'Tes yang labil membuat seluruh pipeline tak bisa dipercaya.'),
        ],
        related: ['deploy', 'docker', 'github'],
      },
      {
        id: 'rate-limit',
        term: 'rate limit',
        kind: 'term',
        aliases: ['rate limits', 'rate-limited', 'rate limited'],
        topic: s('Performance', 'Kinerja'),
        short: s('A cap on how often you may call.', 'Batas seberapa sering kamu boleh memanggil.'),
        definition: s(
          'A rate limit caps requests per window, per key or per account, and answers with an error once the cap is reached. Well-behaved clients read the retry hint and back off instead of hammering.',
          'Rate limit membatasi jumlah permintaan per jendela waktu, per kunci atau akun, dan menjawab dengan galat begitu batasnya tercapai. Klien yang baik membaca petunjuk coba-ulang lalu menunggu, bukan menembak terus.',
        ),
        example: s('The batch job sleeps when it reaches the rate limit.', 'Tugas borongan itu tidur saat mencapai rate limit.'),
        usage: [
          s('Back off exponentially rather than retrying on a fixed interval.', 'Mundur secara eksponensial, bukan mengulang pada jeda tetap.'),
          s('The rate limit is per token, so rotate carefully.', 'Rate limit itu per token, jadi rotasi dengan hati-hati.'),
        ],
        related: ['api', 'latency', 'idempotent'],
      },
      {
        id: 'vector-database',
        term: 'vector database',
        kind: 'term',
        aliases: ['vector databases', 'vector store', 'vector search'],
        topic: s('AI assistants', 'Asisten AI'),
        short: s('A store that searches by similarity.', 'Penyimpanan yang mencari berdasarkan kemiripan.'),
        definition: s(
          'A vector database indexes embeddings and returns the nearest ones to a query, which is what makes semantic search and RAG practical. It complements an ordinary database rather than replacing it.',
          'Basis data vektor mengindeks embedding dan mengembalikan yang terdekat dengan sebuah kueri; itulah yang membuat pencarian semantik dan RAG praktis. Ia melengkapi basis data biasa, bukan menggantikannya.',
        ),
        example: s('Each chunk is written to the vector database after upload.', 'Tiap potongan ditulis ke basis data vektor setelah diunggah.'),
        usage: [
          s('The vector database returns ten neighbours for each query.', 'Basis data vektor mengembalikan sepuluh tetangga untuk tiap kueri.'),
          s('Reindex after changing the embedding model.', 'Buat indeks ulang setelah mengganti model embedding.'),
        ],
        related: ['embedding', 'rag', 'postgresql'],
      },
      {
        id: 'quantization',
        term: 'quantization',
        kind: 'term',
        aliases: ['quantized', 'quantize', 'quantisation'],
        topic: s('AI assistants', 'Asisten AI'),
        short: s('Shrinking model numbers to save memory.', 'Memperkecil angka model untuk menghemat memori.'),
        definition: s(
          'Quantization stores model weights at lower precision, such as 8 or 4 bits instead of 16, which cuts memory use and speeds inference at some cost in quality.',
          'Kuantisasi menyimpan bobot model pada presisi lebih rendah, misalnya 8 atau 4 bit alih-alih 16, sehingga pemakaian memori turun dan inference lebih cepat dengan sedikit biaya mutu.',
        ),
        example: s('The quantized build runs on a laptop.', 'Build terkuantisasi itu berjalan di laptop.'),
        usage: [
          s('A 4-bit quantization fits the model into twelve gigabytes.', 'Kuantisasi 4-bit memuat model itu ke dalam dua belas gigabyte.'),
          s('Quantization changes the numbers, so re-run the evaluations.', 'Kuantisasi mengubah angkanya, jadi jalankan ulang evaluasinya.'),
        ],
        related: ['inference', 'token', 'checkpoint'],
      },
      {
        id: 'checkpoint',
        term: 'checkpoint',
        kind: 'term',
        aliases: ['checkpoints'],
        topic: s('AI assistants', 'Asisten AI'),
        short: s('A saved state you can resume from.', 'Keadaan tersimpan yang bisa dilanjutkan.'),
        definition: s(
          'A checkpoint is a durable snapshot of progress, written so work can continue after a crash instead of starting over. Long training runs and long jobs both rely on them.',
          'Checkpoint adalah potret kemajuan yang tersimpan, ditulis agar pekerjaan bisa lanjut setelah crash alih-alih mulai dari nol. Pelatihan panjang dan tugas panjang sama-sama bergantung padanya.',
        ),
        example: s('Resume from the last checkpoint instead of replaying everything.', 'Lanjutkan dari checkpoint terakhir alih-alih mengulang semuanya.'),
        usage: [
          s('Write a checkpoint every few hundred steps.', 'Tulis checkpoint setiap beberapa ratus langkah.'),
          s('The checkpoint is stale, so the replay starts a little earlier.', 'Checkpoint itu basi, jadi pengulangan dimulai sedikit lebih awal.'),
        ],
        related: ['quantization', 'cache', 'fine-tuning'],
      },
    ]

    const PRODUCTS = [
      {
        id: 'deepseek',
        term: 'DeepSeek',
        kind: 'product',
        aliases: ['DeepSeek-V3', 'DeepSeek-R1', 'DeepSeek-Coder'],
        vendor: 'DeepSeek',
        topic: s('Model provider', 'Penyedia model'),
        short: s('A family of open-weight models from Hangzhou.', 'Keluarga model berbobot terbuka dari Hangzhou.'),
        definition: s(
          'DeepSeek is a model family released with open weights, covering chat, reasoning, and coding variants, and it is the default model behind this harness.',
          'DeepSeek adalah keluarga model yang dirilis dengan bobot terbuka, mencakup varian chat, penalaran, dan coding; ia juga model bawaan di balik harness ini.',
        ),
        example: s('The harness defaults to a DeepSeek model.', 'Harness ini memakai model DeepSeek secara bawaan.'),
        usage: [
          s('DeepSeek models can be served locally from the open weights.', 'Model DeepSeek bisa dijalankan lokal dari bobot terbukanya.'),
          s('Switch to the reasoning variant for a harder problem.', 'Pindah ke varian penalaran untuk masalah yang lebih sulit.'),
        ],
        items: ['DeepSeek-V3', 'DeepSeek-R1', 'DeepSeek-Coder'],
        categories: [
          s('Large language model', 'Model bahasa besar'),
          s('Open weights', 'Bobot terbuka'),
          s('Reasoning', 'Penalaran'),
        ],
        related: ['prompt', 'context-window', 'inference'],
      },
      {
        id: 'gpt',
        term: 'GPT',
        kind: 'product',
        aliases: ['ChatGPT', 'GPT-4', 'GPT-4o', 'GPT-4.1', 'GPT-5'],
        vendor: 'OpenAI',
        topic: s('Model provider', 'Penyedia model'),
        short: s('The OpenAI model line behind ChatGPT.', 'Lini model OpenAI di balik ChatGPT.'),
        definition: s(
          'GPT is the model line from OpenAI that powers ChatGPT and its API. Later releases add multimodal input and longer context while keeping the same chat-completion request shape.',
          'GPT adalah lini model dari OpenAI yang menjalankan ChatGPT dan API-nya. Rilis berikutnya menambah masukan multimodal dan konteks lebih panjang dengan bentuk permintaan chat-completion yang sama.',
        ),
        example: s('The integration sends every turn to GPT.', 'Integrasi itu mengirim tiap giliran ke GPT.'),
        usage: [
          s('GPT accepts images as well as text in one message.', 'GPT menerima gambar maupun teks dalam satu pesan.'),
          s('The agent falls back to GPT when the primary provider is down.', 'Agen beralih ke GPT ketika penyedia utama sedang mati.'),
        ],
        items: ['GPT-4o', 'GPT-4.1', 'GPT-5', 'ChatGPT'],
        categories: [
          s('Large language model', 'Model bahasa besar'),
          s('Multimodal', 'Multimodal'),
          s('Proprietary API', 'API tertutup'),
        ],
        related: ['claude', 'gemini', 'api'],
      },
      {
        id: 'claude',
        term: 'Claude',
        kind: 'product',
        aliases: ['Claude 3', 'Claude 3.5', 'Claude Sonnet', 'Claude Opus', 'Claude Haiku'],
        vendor: 'Anthropic',
        topic: s('Model provider', 'Penyedia model'),
        short: s('The Anthropic model family, strong on long text.', 'Keluarga model Anthropic, kuat untuk teks panjang.'),
        definition: s(
          'Claude is the model family from Anthropic, offered in Haiku, Sonnet, and Opus sizes and known for reading long documents and for careful refusals.',
          'Claude adalah keluarga model dari Anthropic, tersedia dalam ukuran Haiku, Sonnet, dan Opus, dikenal karena sanggup membaca dokumen panjang dan berhati-hati dalam menolak.',
        ),
        example: s('Point the reviewer at Claude for the long transcript.', 'Arahkan peninjau ke Claude untuk transkrip yang panjang.'),
        usage: [
          s('Claude Sonnet is the middle tier between speed and quality.', 'Claude Sonnet adalah tingkat tengah antara kecepatan dan mutu.'),
          s('The long-context run went to Claude instead.', 'Proses konteks panjang dialihkan ke Claude.'),
        ],
        items: ['Claude Haiku', 'Claude Sonnet', 'Claude Opus'],
        categories: [
          s('Large language model', 'Model bahasa besar'),
          s('Long context', 'Konteks panjang'),
          s('Proprietary API', 'API tertutup'),
        ],
        related: ['gpt', 'gemini', 'context-window'],
      },
      {
        id: 'gemini',
        term: 'Gemini',
        kind: 'product',
        aliases: ['Gemini Pro', 'Gemini Flash', 'Gemini Ultra'],
        vendor: 'Google DeepMind',
        topic: s('Model provider', 'Penyedia model'),
        short: s('Google models that read text, image, audio, video.', 'Model Google yang membaca teks, gambar, audio, video.'),
        definition: s(
          'Gemini is the Google DeepMind model family, built to take text, images, audio, and video in the same request, with Pro, Flash, and Ultra tiers trading quality against cost.',
          'Gemini adalah keluarga model Google DeepMind, dirancang menerima teks, gambar, audio, dan video dalam satu permintaan, dengan tingkat Pro, Flash, dan Ultra yang menukar mutu dengan biaya.',
        ),
        example: s('Gemini read the scanned invoice without OCR.', 'Gemini membaca faktur hasil pindai tanpa OCR.'),
        usage: [
          s('Use the Flash tier when latency matters more than depth.', 'Pakai tingkat Flash bila latency lebih penting daripada kedalaman.'),
          s('Gemini returned one answer for the whole video.', 'Gemini memberi satu jawaban untuk seluruh video itu.'),
        ],
        items: ['Gemini Pro', 'Gemini Flash', 'Gemini Ultra'],
        categories: [
          s('Large language model', 'Model bahasa besar'),
          s('Multimodal', 'Multimodal'),
          s('Proprietary API', 'API tertutup'),
        ],
        related: ['gpt', 'claude', 'latency'],
      },
      {
        id: 'llama',
        term: 'Llama',
        kind: 'product',
        aliases: ['Llama 2', 'Llama 3', 'Llama 3.1', 'Llama 3.2'],
        vendor: 'Meta',
        topic: s('Model provider', 'Penyedia model'),
        short: s('Meta open-weight models you can host yourself.', 'Model berbobot terbuka milik Meta yang bisa kamu host sendiri.'),
        definition: s(
          'Llama is the open-weight model line from Meta, published so others can download the weights and run them on their own hardware under a licence.',
          'Llama adalah lini model berbobot terbuka milik Meta, dirilis agar pihak lain bisa mengunduh bobotnya dan menjalankannya di perangkat sendiri di bawah sebuah lisensi.',
        ),
        example: s('They host Llama behind their own gateway.', 'Mereka menjalankan Llama di balik gateway sendiri.'),
        usage: [
          s('Llama needs a capable GPU once you pass the small sizes.', 'Llama butuh GPU mumpuni begitu melewati ukuran kecil.'),
          s('The licence matters more than the weights for some teams.', 'Bagi sebagian tim, lisensinya lebih penting daripada bobotnya.'),
        ],
        items: ['Llama 2', 'Llama 3', 'Llama 3.1'],
        categories: [
          s('Large language model', 'Model bahasa besar'),
          s('Open weights', 'Bobot terbuka'),
          s('Self-hosted', 'Hosting sendiri'),
        ],
        related: ['deepseek', 'quantization', 'inference'],
      },
      {
        id: 'docker',
        term: 'Docker',
        kind: 'product',
        vendor: 'Docker, Inc.',
        topic: s('Developer tooling', 'Perkakas pengembang'),
        short: s('Packs an app together with its environment.', 'Mengemas aplikasi bersama lingkungannya.'),
        definition: s(
          'Docker builds images that contain an application plus its libraries and system files, then runs them as containers. The same image behaves the same on a laptop and on a server.',
          'Docker membangun image yang memuat aplikasi beserta pustaka dan berkas sistemnya, lalu menjalankannya sebagai container. Image yang sama berperilaku sama di laptop maupun di server.',
        ),
        example: s('The service ships as one Docker image.', 'Layanan itu dikirim sebagai satu image Docker.'),
        usage: [
          s('Build the Docker image in CI, never on the server.', 'Bangun image Docker di CI, jangan di server.'),
          s('The container has the same UID inside and outside Docker.', 'Container itu punya UID yang sama di dalam dan di luar Docker.'),
        ],
        items: ['Docker Engine', 'Docker Desktop', 'Docker Hub'],
        categories: [
          s('Containers', 'Container'),
          s('Developer tooling', 'Perkakas pengembang'),
          s('CI/CD', 'CI/CD'),
        ],
        related: ['kubernetes', 'sandbox', 'deploy'],
      },
      {
        id: 'kubernetes',
        term: 'Kubernetes',
        kind: 'product',
        aliases: ['K8s'],
        vendor: 'Cloud Native Computing Foundation',
        topic: s('Infrastructure', 'Infrastruktur'),
        short: s('Schedules containers across many machines.', 'Menjadwalkan container di banyak mesin.'),
        definition: s(
          'Kubernetes runs containers on a cluster and keeps the declared state true: it restarts failed pods, spreads load, and rolls out new versions. It is powerful and heavy, and small projects often do not need it.',
          'Kubernetes menjalankan container di sebuah klaster dan menjaga keadaan yang dideklarasikan tetap benar: ia menghidupkan ulang pod yang gagal, menyebar beban, dan merilis versi baru bertahap. Ia ampuh sekaligus berat, dan proyek kecil sering tidak membutuhkannya.',
        ),
        example: s('Kubernetes restarted the pod after the health check failed.', 'Kubernetes menghidupkan ulang pod setelah health check gagal.'),
        usage: [
          s('The deployment is one Kubernetes manifest per service.', 'Deploy-nya berupa satu manifes Kubernetes per layanan.'),
          s('Kubernetes adds a control plane you now have to operate.', 'Kubernetes menambah bidang kendali yang kini harus kamu operasikan.'),
        ],
        items: ['kubectl', 'Helm', 'Kubernetes Engine'],
        categories: [
          s('Orchestration', 'Orkestrasi'),
          s('Infrastructure', 'Infrastruktur'),
          s('Containers', 'Container'),
        ],
        related: ['docker', 'deploy', 'pipeline'],
      },
      {
        id: 'postgresql',
        term: 'PostgreSQL',
        kind: 'product',
        aliases: ['Postgres'],
        vendor: 'PostgreSQL Global Development Group',
        topic: s('Data', 'Data'),
        short: s('A mature open-source SQL database.', 'Basis data SQL open-source yang matang.'),
        definition: s(
          'PostgreSQL is a relational database with strong transactions, rich types, and extensions for full-text and vector search. It is the default safe choice for application data.',
          'PostgreSQL adalah basis data relasional dengan transaksi kuat, tipe data kaya, dan ekstensi untuk pencarian teks penuh maupun vektor. Ia pilihan aman bawaan untuk data aplikasi.',
        ),
        example: s('The migration adds one index to PostgreSQL.', 'Migrasi itu menambah satu indeks ke PostgreSQL.'),
        usage: [
          s('PostgreSQL answered the aggregate in under ten milliseconds.', 'PostgreSQL menjawab agregat itu di bawah sepuluh milidetik.'),
          s('Keep the vector column in PostgreSQL until scale forces a split.', 'Simpan kolom vektor di PostgreSQL sampai skala memaksa pemisahan.'),
        ],
        items: ['PostgreSQL server', 'psql', 'PostGIS'],
        categories: [
          s('Database', 'Basis data'),
          s('Relational', 'Relasional'),
          s('Open source', 'Open source'),
        ],
        related: ['schema', 'migration', 'vector-database'],
      },
      {
        id: 'react',
        term: 'React',
        kind: 'product',
        vendor: 'Meta',
        topic: s('Front-end', 'Front-end'),
        short: s('A UI library built from components.', 'Pustaka antarmuka berbasis komponen.'),
        definition: s(
          'React renders a user interface from components and updates only what changed. It is a library, not a full framework: routing and data fetching stay separate choices.',
          'React merender antarmuka dari komponen dan memperbarui hanya bagian yang berubah. Ia pustaka, bukan framework lengkap: routing dan pengambilan data tetap pilihan terpisah.',
        ),
        example: s('The list re-renders because a React key is missing.', 'Daftar itu tergambar ulang karena key React-nya hilang.'),
        usage: [
          s('React state is not the same as server state.', 'State React tidak sama dengan state di server.'),
          s('The panel is a React component registered in a slot.', 'Panel itu komponen React yang didaftarkan di sebuah slot.'),
        ],
        items: ['React DOM', 'React Server Components', 'Hooks'],
        categories: [
          s('Front-end', 'Front-end'),
          s('UI library', 'Pustaka antarmuka'),
          s('Open source', 'Open source'),
        ],
        related: ['typescript', 'framework', 'runtime'],
      },
      {
        id: 'typescript',
        term: 'TypeScript',
        kind: 'product',
        aliases: ['TS'],
        vendor: 'Microsoft',
        topic: s('Language', 'Bahasa pemrograman'),
        short: s('JavaScript with static types.', 'JavaScript dengan tipe statis.'),
        definition: s(
          'TypeScript adds optional static types to JavaScript and compiles them away, so mistakes surface in the editor instead of at runtime. Types describe shapes; they do not check data that arrives at runtime.',
          'TypeScript menambahkan tipe statis opsional ke JavaScript lalu menghapusnya saat kompilasi, sehingga kesalahan muncul di editor alih-alih saat berjalan. Tipe menjelaskan bentuk; ia tidak memeriksa data yang datang saat runtime.',
        ),
        example: s('The handler is typed in TypeScript but validated at runtime.', 'Penangan itu bertipe TypeScript tetapi tetap divalidasi saat runtime.'),
        usage: [
          s('A TypeScript error is cheaper than a production error.', 'Galat TypeScript lebih murah daripada galat produksi.'),
          s('The generated TypeScript definitions lag one release behind.', 'Definisi TypeScript hasil bangkitan tertinggal satu rilis.'),
        ],
        items: ['tsc', 'TypeScript language service', 'tsconfig'],
        categories: [
          s('Language', 'Bahasa pemrograman'),
          s('Static typing', 'Tipe statis'),
          s('Open source', 'Open source'),
        ],
        related: ['react', 'schema', 'framework'],
      },
      {
        id: 'github',
        term: 'GitHub',
        kind: 'product',
        vendor: 'Microsoft',
        topic: s('Collaboration', 'Kolaborasi'),
        short: s('Hosting for Git repositories and review.', 'Tempat menyimpan repositori Git dan meninjau kode.'),
        definition: s(
          'GitHub hosts Git repositories and adds pull requests, issues, and automation on top. The review thread on a pull request is often where a change is really agreed.',
          'GitHub menyimpan repositori Git dan menambahkan pull request, issue, serta otomasi di atasnya. Diskusi pada pull request sering menjadi tempat perubahan benar-benar disepakati.',
        ),
        example: s('The fix is already on GitHub in a draft pull request.', 'Perbaikannya sudah ada di GitHub dalam pull request draf.'),
        usage: [
          s('GitHub Actions runs the pipeline on every push.', 'GitHub Actions menjalankan pipeline pada tiap push.'),
          s('Link the GitHub issue in the commit message.', 'Tautkan issue GitHub di pesan commit.'),
        ],
        items: ['GitHub Actions', 'Pull requests', 'GitHub Pages'],
        categories: [
          s('Version control hosting', 'Hosting kontrol versi'),
          s('Collaboration', 'Kolaborasi'),
          s('CI/CD', 'CI/CD'),
        ],
        related: ['repository', 'commit', 'pipeline'],
      },
    ]

    const LEXICON = TERMS.concat(PRODUCTS)
    const ENTRY_BY_ID = new Map(LEXICON.map((e) => [e.id, e]))

    // ------------------------------------------------------------- matching

    const SURFACES = []
    for (const entry of LEXICON) {
      SURFACES.push({ text: entry.term, entry })
      for (const alias of entry.aliases || []) SURFACES.push({ text: alias, entry })
    }
    SURFACES.sort((a, b) => b.text.length - a.text.length)

    const SURFACE_BY_LOWER = new Map()
    const EXACT_SURFACES = new Set()
    for (const item of SURFACES) {
      const key = item.text.toLowerCase()
      if (!SURFACE_BY_LOWER.has(key)) SURFACE_BY_LOWER.set(key, item.entry)
      EXACT_SURFACES.add(item.text)
    }

    const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const SOURCE = SURFACES.map((item) => escapeRe(item.text)).join('|')
    const MATCH_RE = new RegExp('(?:' + SOURCE + ')', 'gi')
    const HAS_MATCH_RE = new RegExp('(?:' + SOURCE + ')', 'i')

    function findMatches(text) {
      const found = []
      if (!text || text.length < 3) return found
      MATCH_RE.lastIndex = 0
      let match
      while ((match = MATCH_RE.exec(text)) !== null) {
        const entry = SURFACE_BY_LOWER.get(match[0].toLowerCase())
        if (!entry) continue
        // An acronym entry only matches the exact spellings it declares, so
        // ordinary lowercase words such as "api" are left alone.
        if (entry.caseSensitive && !EXACT_SURFACES.has(match[0])) continue
        if (match[0].length < 2) continue
        found.push({ start: match.index, end: match.index + match[0].length, entry })
        if (found.length > 60) break
      }
      return found
    }

    // ---------------------------------------------------------------- text

    /**
     * Languages the pane can answer in. `label` is written in the language
     * itself; only en and id carry a full translation, everything else falls
     * back to English for the chrome while the definition is localised.
     */
    const LANGUAGES = [
      { code: 'en', label: 'English' },
      { code: 'id', label: 'Bahasa Indonesia' },
      { code: 'ms', label: 'Bahasa Melayu' },
      { code: 'th', label: 'ไทย' },
      { code: 'vi', label: 'Tiếng Việt' },
      { code: 'tl', label: 'Filipino' },
      { code: 'es', label: 'Español' },
      { code: 'fr', label: 'Français' },
      { code: 'de', label: 'Deutsch' },
      { code: 'pt', label: 'Português' },
      { code: 'it', label: 'Italiano' },
      { code: 'nl', label: 'Nederlands' },
      { code: 'ru', label: 'Русский' },
      { code: 'ja', label: '日本語' },
      { code: 'zh', label: '中文' },
      { code: 'ko', label: '한국어' },
      { code: 'ar', label: 'العربية' },
      { code: 'hi', label: 'हिन्दी' },
      { code: 'tr', label: 'Türkçe' },
      { code: 'pl', label: 'Polski' },
    ]
    const LANGUAGE_BY_CODE = new Map(LANGUAGES.map((entry) => [entry.code, entry]))
    const COPY_CACHE = new Map()

    /** English fills the gaps, so a new language only needs what it translates. */
    function dictFor(lang) {
      if (COPY_CACHE.has(lang)) return COPY_CACHE.get(lang)
      const merged = Object.assign({}, COPY.en, COPY[lang] || {})
      COPY_CACHE.set(lang, merged)
      return merged
    }

    const COPY = {
      en: {
        term: 'Term',
        product: 'Product',
        language: 'Language',
        definition: 'Definition',
        inShort: 'In short',
        contextHere: 'In this message',
        usage: 'Usage examples',
        items: 'Products in this line',
        related: 'Related',
        openHint: 'Dotted words open another panel.',
        clickHint: 'Click for the full definition',
        close: 'Close',
        bank: 'Words bank',
        bankOpen: 'Open a panel for a saved word',
        bankEmpty: 'No words recorded yet. Send a message, then come back.',
        bankNoMatch: 'Nothing matches that search.',
        search: 'Search a word',
        used: 'Used',
        opened: 'Opened',
        sessions: 'Sessions',
        jump: 'Open session',
        copy: 'Copy',
        whatDis: 'What dis?',
        sourcePrefix: 'Source:',
        otherSenses: 'Other senses',
        filter: 'Filter',
        sort: 'Sort',
        filterAll: 'Everything',
        filterTerm: 'Terms',
        filterProduct: 'Products',
        filterUnknown: 'Without a definition',
        filterOpened: 'Already opened',
        filterUnopened: 'Never opened',
        sortDate: 'Date modified',
        sortName: 'Name',
        noWordsFor: 'No word starts with {0}',
        loading: 'Loading',
        settings: 'Settings',
        pickTwo: 'Pick two languages',
        aiError: 'Could not get a definition',
        retry: 'Try again',
        shape: 'Word shape',
        nearby: 'Terms around it',
        save: 'Save to bank',
        history: 'History',
        none: 'Nothing recorded yet.',
        times: '×',
        minutesAgo: 'min ago',
        hoursAgo: 'h ago',
        daysAgo: 'd ago',
        justNow: 'just now',
        unknown: 'Not in dictionary',
        word: 'Word',
      },
      id: {
        term: 'Istilah',
        product: 'Produk',
        language: 'Bahasa',
        definition: 'Definisi',
        inShort: 'Singkatnya',
        contextHere: 'Di pesan ini',
        usage: 'Contoh penggunaan',
        items: 'Produk dalam lini ini',
        related: 'Terkait',
        openHint: 'Kata bergaris putus-putus membuka panel baru.',
        clickHint: 'Klik untuk definisi lengkap',
        close: 'Tutup',
        bank: 'Bank kata',
        bankOpen: 'Buka panel untuk kata tersimpan',
        bankEmpty: 'Belum ada kata tercatat. Kirim pesan dulu, lalu kembali ke sini.',
        bankNoMatch: 'Tidak ada yang cocok dengan pencarian itu.',
        search: 'Cari kata',
        used: 'Dipakai',
        opened: 'Dibuka',
        sessions: 'Sesi',
        jump: 'Buka sesi',
        copy: 'Salin',
        whatDis: 'What dis?',
        sourcePrefix: 'Sumber:',
        otherSenses: 'Makna lain',
        filter: 'Filter',
        sort: 'Urutkan',
        filterAll: 'Semua',
        filterTerm: 'Istilah',
        filterProduct: 'Produk',
        filterUnknown: 'Tanpa definisi',
        filterOpened: 'Sudah dibuka',
        filterUnopened: 'Belum dibuka',
        sortDate: 'Tanggal diubah',
        sortName: 'Nama',
        noWordsFor: 'Tidak ada kata berawalan {0}',
        loading: 'Memuat',
        settings: 'Pengaturan',
        pickTwo: 'Pilih dua bahasa',
        aiError: 'Gagal mengambil definisi',
        retry: 'Coba lagi',
        shape: 'Bentuk kata',
        nearby: 'Istilah di sekitarnya',
        save: 'Simpan ke bank',
        history: 'Riwayat',
        none: 'Belum ada catatan.',
        times: '×',
        minutesAgo: 'menit lalu',
        hoursAgo: 'jam lalu',
        daysAgo: 'hari lalu',
        justNow: 'baru saja',
        unknown: 'Tidak di kamus',
        word: 'Kata',
      },
    }

    const pick = (pair, lang) => (pair && (pair[lang] || pair.en)) || ''

    const LOCALE_TAG = { en: 'en-GB', id: 'id-ID' }

    function fmtDateTime(ms, lang) {
      try {
        return new Intl.DateTimeFormat(LOCALE_TAG[lang] || 'en-GB', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(ms))
      } catch (error) {
        return new Date(ms).toISOString().slice(5, 16).replace('T', ' ')
      }
    }

    function relTime(ms, lang) {
      const t = dictFor(lang)
      const delta = Date.now() - ms
      if (!ms || delta < 0 || delta < 60_000) return t.justNow
      const minutes = Math.round(delta / 60_000)
      if (minutes < 60) return minutes + ' ' + t.minutesAgo
      const hours = Math.round(minutes / 60)
      if (hours < 24) return hours + ' ' + t.hoursAgo
      const days = Math.round(hours / 24)
      if (days < 7) return days + ' ' + t.daysAgo
      return fmtDateTime(ms, lang)
    }

    // ------------------------------------------------------------- word bank

    const BANK_KEY = 'dsh-complex-words:bank:v1'
    const MAX_WORDS = 240
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    const MAX_EVENTS = 24
    const MAX_SESSIONS = 12
    const MINUTE = 60_000

    const bank = { data: { version: 1, words: {} }, timer: 0 }

    function loadBank() {
      try {
        const raw = window.localStorage.getItem(BANK_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (!parsed || parsed.version !== 1 || !parsed.words || typeof parsed.words !== 'object') return
        const words = {}
        let kept = 0
        for (const [id, stored] of Object.entries(parsed.words)) {
          const record = sanitizeRecord(stored, id)
          if (!record) continue
          words[id] = record
          kept += 1
          if (kept >= MAX_WORDS) break
        }
        bank.data = { version: 1, words }
      } catch (error) {
        /* a corrupt or unavailable store starts empty */
      }
    }

    /**
     * A stored record is data from an older version of this plugin, so every
     * field is rebuilt from a known type instead of trusted. Bad records are
     * dropped rather than rendered as "Used abc×".
     */
    function sanitizeRecord(stored, id) {
      if (!stored || typeof stored !== 'object') return null
      const term = typeof stored.term === 'string' && stored.term.trim() ? stored.term : ''
      if (!term) return null
      const num = (value) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0)
      const stamps = (value) =>
        Array.isArray(value) ? value.filter(num).slice(-MAX_EVENTS) : []
      const sessions = {}
      if (stored.sessions && typeof stored.sessions === 'object') {
        for (const [key, entry] of Object.entries(stored.sessions)) {
          if (!entry || typeof entry !== 'object') continue
          sessions[key] = {
            first: num(entry.first),
            last: num(entry.last),
            uses: num(entry.uses),
            opens: num(entry.opens),
          }
        }
      }
      const ai = {}
      if (stored.ai && typeof stored.ai === 'object') {
        for (const [key, entry] of Object.entries(stored.ai)) {
          if (entry && typeof entry === 'object' && typeof entry.definition === 'string') {
            ai[key] = entry
          }
        }
      }
      return {
        id: typeof stored.id === 'string' && stored.id ? stored.id : id,
        term,
        useCount: num(stored.useCount),
        openCount: num(stored.openCount),
        firstSeenAt: num(stored.firstSeenAt),
        lastUseAt: num(stored.lastUseAt),
        lastOpenAt: num(stored.lastOpenAt),
        uses: stamps(stored.uses),
        opens: stamps(stored.opens),
        sessions,
        ...(Object.keys(ai).length ? { ai } : {}),
      }
    }

    function flushBank() {
      bank.timer = 0
      try {
        window.localStorage.setItem(BANK_KEY, JSON.stringify(bank.data))
      } catch (error) {
        /* quota exhaustion leaves the in-memory bank intact */
      }
      store.set({ bankTick: Date.now() })
    }

    function saveBankSoon() {
      if (bank.timer) return
      bank.timer = window.setTimeout(flushBank, 700)
    }

    function ensureWord(id, term) {
      const words = bank.data.words
      let record = words[id]
      if (!record) {
        record = {
          id,
          term,
          useCount: 0,
          openCount: 0,
          firstSeenAt: Date.now(),
          lastUseAt: 0,
          lastOpenAt: 0,
          uses: [],
          opens: [],
          sessions: {},
        }
        words[id] = record
      } else if (term && record.term !== term) {
        record.term = term
      }
      return record
    }

    function pushEvent(list, event) {
      list.push(event)
      while (list.length > MAX_EVENTS) list.shift()
    }

    function touchSession(record, sessionId) {
      if (!sessionId) return null
      let entry = record.sessions[sessionId]
      if (!entry) {
        entry = { first: Date.now(), last: Date.now(), uses: 0, opens: 0 }
        record.sessions[sessionId] = entry
        const keys = Object.keys(record.sessions)
        if (keys.length > MAX_SESSIONS) {
          keys
            .sort((a, b) => (record.sessions[a].last || 0) - (record.sessions[b].last || 0))
            .slice(0, keys.length - MAX_SESSIONS)
            .forEach((key) => delete record.sessions[key])
        }
      }
      entry.last = Date.now()
      return entry
    }

    function recordUse(id, term, sessionId) {
      const now = Date.now()
      const record = ensureWord(id, term)
      const minute = Math.floor(now / MINUTE)
      for (const used of record.uses) {
        if (used.minute === minute && (used.session || '') === (sessionId || '')) return
      }
      if (record.lastUseAt && now - record.lastUseAt < 4000) return
      record.lastUseAt = now
      record.useCount += 1
      pushEvent(record.uses, { at: now, minute, session: sessionId || '' })
      const entry = touchSession(record, sessionId)
      if (entry) entry.uses += 1
      pruneBank()
      saveBankSoon()
    }

    function recordOpen(id, term, sessionId, from) {
      const now = Date.now()
      const record = ensureWord(id, term)
      record.openCount += 1
      record.lastOpenAt = now
      pushEvent(record.opens, { at: now, session: sessionId || '', from: from || 'message' })
      const entry = touchSession(record, sessionId)
      if (entry) entry.opens += 1
      pruneBank()
      saveBankSoon()
    }

    function pruneBank() {
      const words = bank.data.words
      const keys = Object.keys(words)
      if (keys.length <= MAX_WORDS) return
      keys
        .sort((a, b) => {
          const left = words[a]
          const right = words[b]
          return Math.max(left.lastUseAt, left.lastOpenAt, left.firstSeenAt) -
            Math.max(right.lastUseAt, right.lastOpenAt, right.firstSeenAt)
        })
        .slice(0, keys.length - MAX_WORDS)
        .forEach((key) => delete words[key])
    }

    function bankRecord(id) {
      return bank.data.words[id] || null
    }

    function bankEntries() {
      return Object.keys(bank.data.words)
        .map((key) => bank.data.words[key])
        .sort((a, b) => Math.max(b.lastUseAt, b.lastOpenAt, b.firstSeenAt) - Math.max(a.lastUseAt, a.lastOpenAt, a.firstSeenAt))
    }

    function rawKey(text) {
      return 'raw:' + String(text || '').toLowerCase().replace(/\s+/g, ' ').trim()
    }

    // ---------------------------------------------------------------- store

    const LANG_KEY = 'dsh-complex-words:lang'
    const LANGS_KEY = 'dsh-complex-words:langs:v1'
    const DEFAULT_PAIR = ['en', 'id']

    const services = { sessions: null, uiWorkspace: null, sidebarRight: null }
    let sessionTitles = {}

    function readPair() {
      try {
        const raw = window.localStorage.getItem(LANGS_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            const only = []
            for (const code of parsed) {
              // A stale value (a language we no longer ship) must not survive,
              // or the switch would show a code the Host rejects.
              if (typeof code !== 'string' || !LANGUAGE_BY_CODE.has(code)) continue
              if (only.includes(code)) continue
              only.push(code)
            }
            if (only.length) return only.slice(0, 2)
          }
        }
      } catch (error) {
        /* storage may be unavailable; the default stands */
      }
      return DEFAULT_PAIR.slice()
    }

    function readLang() {
      const pair = readPair()
      try {
        const stored = window.localStorage.getItem(LANG_KEY)
        if (stored && pair.includes(stored)) return stored
      } catch (error) {
        /* storage may be unavailable; the default stands */
      }
      return pair[0]
    }

    const store = (() => {
      let state = {
        lang: readLang(),
        langs: readPair(),
        panel: null,
        bankOpen: false,
        tooltip: null,
        menu: null,
        bankTick: 0,
        sessionId: '',
        viewportTick: 0,
      }
      const listeners = new Set()
      return {
        get: () => state,
        set(patch) {
          state = Object.assign({}, state, patch)
          for (const listener of listeners) listener()
        },
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
      }
    })()

    function setLang(lang) {
      store.set({ lang })
      try {
        window.localStorage.setItem(LANG_KEY, lang)
      } catch (error) {
        /* ignore */
      }
    }

    /**
     * Keep the switch to two languages. Picking a third evicts the older
     * selection, so the pair always reflects the two you reach for.
     */
    function toggleLangPair(code) {
      const pair = store.get().langs || DEFAULT_PAIR.slice()
      let next
      if (pair.includes(code)) {
        if (pair.length < 2) return
        next = pair.filter((item) => item !== code)
      } else {
        next = pair.length >= 2 ? [pair[1], code] : pair.concat(code)
      }
      store.set({ langs: next })
      try {
        window.localStorage.setItem(LANGS_KEY, JSON.stringify(next))
      } catch (error) {
        /* ignore */
      }
      if (next.includes(code)) setLang(code)
      else if (!next.includes(store.get().lang)) setLang(next[0])
    }

    /** The picker shared by the panel switch and the startup settings. */
    function LanguagePicker({ pair, onToggle }) {
      return h(
        'div',
        { className: 'cw-hero-pop-list' },
        LANGUAGES.map((entry) => {
          const on = pair.includes(entry.code)
          return h(
            'button',
            {
              key: entry.code,
              type: 'button',
              className: 'cw-pop-item cw-langopt' + (on ? ' cw-pop-on' : ''),
              onClick: () => onToggle(entry.code),
            },
            h('span', { className: 'cw-langopt-code' }, entry.code.toUpperCase()),
            h('span', { className: 'cw-langopt-label' }, entry.label),
            on ? h('span', { className: 'cw-langopt-tick' }, '✓') : null,
          )
        }),
      )
    }

    function setSessionId(id) {
      if (!id || store.get().sessionId === id) return
      store.set({ sessionId: id })
    }

    function currentSession() {
      return store.get().sessionId || ''
    }

    /**
     * The pane shows one word at a time and keeps what it showed before, so the
     * mouse back button can walk the trail: opening the word already shown
     * closes the pane (and is not counted as a read), opening another word
     * replaces the content and remembers the previous one.
     */
    const panelHistory = []
    const forwardHistory = []
    const MAX_HISTORY = 20

    const TAB_ID = 'complex-words-tab'
    /** One name everywhere: tab, welcome screen, and the locale metadata. */
    const BRAND = 'Whalesarium'
    /** The badge beside the mark, a nod at the harness it lives in. */
    const WORDMARK = 'Into the Known'
    const TAB_TITLE = () => BRAND

    /**
     * Bowhead whale silhouette, traced from the same outline the ASCII study
     * used: snout at the left, forked fluke at the right, eye punched out with
     * evenodd so it works on any background.
     */
    const WHALE_PATH =
      "M13.5 33.2L27.0 32.4L27.0 37.6L13.5 36.8L13.0 36.7L12.6 36.6L12.2 36.3L11.9 35.9L11.8 35.5L11.7 35.0L11.8 34.5L11.9 34.1L12.2 33.7L12.6 33.4L13.0 33.3ZM28.4 37.8L30.1 37.4L31.8 36.9L33.4 36.2L35.0 35.5L36.6 34.7L38.2 33.8L39.7 32.8L41.2 31.7L42.7 30.5L44.1 29.3L45.4 27.9L46.8 26.4L48.0 24.9L49.3 23.3L50.5 21.6L51.6 19.8L52.7 18.0L53.8 16.0L54.8 14.0L55.7 11.9L56.5 9.6L57.0 7.0L57.0 7.0L54.4 7.6L52.2 8.4L50.1 9.3L48.1 10.3L46.2 11.2L44.3 12.2L42.5 13.2L40.8 14.2L39.2 15.3L37.6 16.3L36.1 17.4L34.6 18.5L33.3 19.6L32.0 20.8L30.7 21.9L29.5 23.1L28.4 24.4L27.3 25.6L26.3 26.9L25.4 28.2L24.5 29.6L23.6 31.0ZM23.6 39.0L24.5 40.4L25.4 41.8L26.3 43.1L27.3 44.4L28.4 45.6L29.5 46.9L30.7 48.1L32.0 49.2L33.3 50.4L34.6 51.5L36.1 52.6L37.6 53.7L39.2 54.7L40.8 55.8L42.5 56.8L44.3 57.8L46.2 58.8L48.1 59.7L50.1 60.7L52.2 61.6L54.4 62.4L57.0 63.0L57.0 63.0L56.5 60.4L55.7 58.1L54.8 56.0L53.8 54.0L52.7 52.0L51.6 50.2L50.5 48.4L49.3 46.7L48.0 45.1L46.8 43.6L45.4 42.1L44.1 40.7L42.7 39.5L41.2 38.3L39.7 37.2L38.2 36.2L36.6 35.3L35.0 34.5L33.4 33.8L31.8 33.1L30.1 32.6L28.4 32.2Z"
    const WHALE_VIEWBOX = '10 6 48 59'

    function WhaleMark({ size }) {
      const box = size || 22
      return h(
        'svg',
        {
          className: 'cw-mark',
          width: box,
          height: Math.round(box * 1.2),
          viewBox: WHALE_VIEWBOX,
          'aria-hidden': 'true',
        },
        h('path', { d: WHALE_PATH, fill: 'currentColor', fillRule: 'nonzero' }),
      )
    }

    /** Whether the native right-sidebar tab is currently rendering our pane. */
    let nativeMounted = false
    /** Whether the native tab type registered, so the dock is the only surface. */
    let dockRegistered = false

    /**
     * Open the native right sidebar on our tab. The column service takes the tab
     * kind as its first argument; when the profile has no right sidebar the
     * floating pane remains the fallback.
     */
    function openDock() {
      const right = services.sidebarRight
      if (!right || typeof right.openTab !== 'function') return false
      let opened = false
      try {
        right.openTab(TAB_ID)
        opened = true
      } catch (error) {
        opened = false
      }
      if (!opened) {
        try {
          right.openTab({ kind: TAB_ID })
          opened = true
        } catch (error) {
          opened = false
        }
      }
      if (opened) {
        // A column that stayed collapsed still needs its header control pressed.
        window.setTimeout(() => {
          if (nativeMounted) return
          const button = document.querySelector('[data-sidebar-right-expand]')
          if (button && typeof button.click === 'function') button.click()
        }, 120)
      }
      return opened
    }

    function showPanel(next) {
      const current = store.get().panel
      if (current) {
        panelHistory.push(current)
        if (panelHistory.length > MAX_HISTORY) panelHistory.shift()
      }
      // Opening something new abandons the forward trail, exactly like a browser.
      forwardHistory.length = 0
      // The dock shows one view, so picking a word leaves the bank list behind
      // and reveals that word; the book control in the header returns to it.
      store.set({ panel: next, bankOpen: false, tooltip: null, menu: null })
      openDock()
    }

    /**
     * `allowToggle` is set only by a click on the highlighted word in the
     * transcript, where clicking the word already shown closes the pane.
     * Inside a panel the same word is a no-op instead: the pane already answers
     * that word, and closing it from there would just look broken.
     */
    function openTerm(id, context, from, allowToggle) {
      const entry = ENTRY_BY_ID.get(id)
      if (!entry) return
      const panel = store.get().panel
      if (panel && panel.type === 'term' && panel.id === id) {
        if (allowToggle) closePanel()
        return
      }
      syncLanguage(entry.term, context)
      recordOpen(id, entry.term, currentSession(), from)
      showPanel({ type: 'term', id, context: context || '' })
    }

    function openRaw(text, context, allowToggle) {
      const clean = String(text || '').replace(/\s+/g, ' ').trim()
      if (!clean) return
      const panel = store.get().panel
      if (panel && panel.type === 'raw' && panel.text === clean) {
        if (allowToggle) closePanel()
        return
      }
      syncLanguage(clean, context)
      ensureWord(rawKey(clean), clean)
      recordOpen(rawKey(clean), clean, currentSession(), 'selection')
      showPanel({ type: 'raw', text: clean, context: context || '' })
    }

    function toggleBank() {
      store.set({ bankOpen: !store.get().bankOpen, menu: null })
      openDock()
    }

    function closePanel() {
      panelHistory.length = 0
      forwardHistory.length = 0
      store.set({ panel: null, tooltip: null, menu: null })
    }

    function closeBank() {
      store.set({ bankOpen: false })
    }

    /** Mouse back button / Alt+Left: step back through the pane's trail. */
    function goBack() {
      const state = store.get()
      if (state.menu) {
        store.set({ menu: null })
        return true
      }
      if (state.panel && panelHistory.length) {
        const previous = panelHistory.pop()
        forwardHistory.push(state.panel)
        if (forwardHistory.length > MAX_HISTORY) forwardHistory.shift()
        store.set({ panel: previous, tooltip: null, menu: null })
        return true
      }
      if (state.panel) {
        closePanel()
        return true
      }
      if (state.bankOpen) {
        closeBank()
        return true
      }
      return false
    }

    /** The inverse of `goBack`: replay what the back trail stepped over. */
    function goForward() {
      const state = store.get()
      if (!forwardHistory.length) return false
      const next = forwardHistory.pop()
      if (state.panel) {
        panelHistory.push(state.panel)
        if (panelHistory.length > MAX_HISTORY) panelHistory.shift()
      }
      store.set({ panel: next, bankOpen: false, tooltip: null, menu: null })
      openDock()
      return true
    }

    // ------------------------------------------------------------- sentences

    function sentenceAround(rawText, term) {
      const text = String(rawText || '').replace(/\s+/g, ' ').trim()
      if (!text) return ''
      const index = text.toLowerCase().indexOf(String(term).toLowerCase())
      if (index < 0) return text.length > 240 ? text.slice(0, 240) + '…' : text
      let start = 0
      for (let i = index; i > 0; i -= 1) {
        const ch = text[i - 1]
        if (ch === '.' || ch === '!' || ch === '?') {
          start = i
          break
        }
      }
      let end = text.length
      for (let i = index + term.length; i < text.length; i += 1) {
        const ch = text[i]
        if ((ch === '.' || ch === '!' || ch === '?') && (i + 1 === text.length || text[i + 1] === ' ')) {
          end = i + 1
          break
        }
      }
      let sentence = text.slice(start, end).trim()
      if (sentence.length < term.length) sentence = text
      if (sentence.length > 240) sentence = sentence.slice(0, 240) + '…'
      return sentence
    }

    // ----------------------------------------------------------- decoration

    const BLOCK_TAGS = {
      P: 1, LI: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1,
      BLOCKQUOTE: 1, TD: 1, TH: 1, DD: 1, DT: 1, FIGCAPTION: 1, ARTICLE: 1,
    }
    const INLINE_TAGS = {
      SPAN: 1, STRONG: 1, EM: 1, B: 1, I: 1, U: 1, S: 1, MARK: 1, SMALL: 1,
      SUP: 1, SUB: 1, ABBR: 1, Q: 1, CITE: 1, DEL: 1, INS: 1,
    }
    const SKIP_TAGS = {
      PRE: 1, CODE: 1, A: 1, BUTTON: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1,
      OPTION: 1, SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, SVG: 1, KBD: 1, SAMP: 1,
      NAV: 1, ASIDE: 1, HEADER: 1, FOOTER: 1, IFRAME: 1, VIDEO: 1, AUDIO: 1,
    }
    const SKIP_ROLES = {
      button: 1, link: 1, menuitem: 1, tab: 1, option: 1, textbox: 1,
      searchbox: 1, switch: 1, checkbox: 1, radio: 1, tooltip: 1, navigation: 1,
    }
    const LOOSE_CONTAINERS = { DIV: 1, SECTION: 1 }

    function isEligible(node) {
      let el = node.parentElement
      if (!el) return false
      if (el.closest('[data-cw],[data-cw-ui],[contenteditable="true"]')) return false
      for (let hop = 0; el && hop < 8; hop += 1) {
        const tag = el.tagName
        if (SKIP_TAGS[tag]) return false
        if (el.getAttribute) {
          const role = el.getAttribute('role')
          if (role && SKIP_ROLES[role]) return false
        }
        if (BLOCK_TAGS[tag]) return true
        if (!INLINE_TAGS[tag]) return false
        el = el.parentElement
      }
      return false
    }

    /**
     * A renderer that emits a bare <div> for a paragraph would be rejected by
     * the strict rule above. Such a node stays a candidate for the loose pass,
     * which is only switched on when a scan finds matches but decorates none.
     */
    function isLooseCandidate(node) {
      const el = node.parentElement
      if (!el) return false
      if (el.closest('[data-cw],[data-cw-ui],[contenteditable="true"],[role]')) return false
      let container = null
      let probe = el
      for (let hop = 0; probe && hop < 3; hop += 1) {
        if (BLOCK_TAGS[probe.tagName]) return false
        if (LOOSE_CONTAINERS[probe.tagName]) {
          container = probe
          break
        }
        if (!INLINE_TAGS[probe.tagName]) return false
        probe = probe.parentElement
      }
      if (!container) return false
      if (container.getAttribute('aria-hidden') === 'true') return false
      return (container.textContent || '').trim().length >= 12
    }

    function makeHighlight(entry, text) {
      const span = document.createElement('span')
      span.className = 'cw-hl'
      span.setAttribute('data-cw', entry.id)
      span.setAttribute('data-kind', entry.kind)
      span.setAttribute('role', 'link')
      span.setAttribute('tabindex', '-1')
      span.textContent = text
      return span
    }

    function decorateTextNode(node) {
      const text = node.data
      const matches = findMatches(text)
      if (!matches.length) return 0
      const parent = node.parentNode
      if (!parent) return 0
      const fragment = document.createDocumentFragment()
      let cursor = 0
      let applied = 0
      for (const match of matches) {
        if (match.start < cursor) continue
        if (match.start > cursor) fragment.appendChild(document.createTextNode(text.slice(cursor, match.start)))
        fragment.appendChild(makeHighlight(match.entry, text.slice(match.start, match.end)))
        cursor = match.end
        applied += 1
        recordUse(match.entry.id, match.entry.term, currentSession())
      }
      if (!applied) return 0
      if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)))
      parent.replaceChild(fragment, node)
      return applied
    }

    let observer = null
    let debounceTimer = 0
    let decorating = false
    let looseMode = false

    function scanNow() {
      if (decorating) return
      const root = document.querySelector('main') || document.querySelector('[role="main"]') || document.body
      if (!root) return
      decorating = true
      let applied = 0
      let looseCandidates = 0
      try {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const data = node.data
            if (!data || data.length < 3) return NodeFilter.FILTER_REJECT
            if (!HAS_MATCH_RE.test(data)) return NodeFilter.FILTER_REJECT
            if (isEligible(node)) return NodeFilter.FILTER_ACCEPT
            if (isLooseCandidate(node)) {
              if (looseMode) return NodeFilter.FILTER_ACCEPT
              looseCandidates += 1
            }
            return NodeFilter.FILTER_REJECT
          },
        })
        const pending = []
        let node = walker.nextNode()
        while (node && pending.length < 900) {
          pending.push(node)
          node = walker.nextNode()
        }
        for (const textNode of pending) {
          if (textNode.isConnected) applied += decorateTextNode(textNode)
        }
      } finally {
        decorating = false
      }
      if (!looseMode && applied === 0 && looseCandidates > 0) {
        looseMode = true
        scanNow()
      }
    }

    function scheduleScan() {
      if (debounceTimer) window.clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(() => {
        debounceTimer = 0
        scanNow()
      }, 320)
    }

    function isOwnMutation(record) {
      const target = record.target
      if (!target) return true
      const el = target.nodeType === 1 ? target : target.parentElement
      if (!el || !el.closest) return false
      return Boolean(el.closest('[data-cw],[data-cw-ui]'))
    }

    function startObserver() {
      observer = new MutationObserver((records) => {
        for (const record of records) {
          if (!isOwnMutation(record)) {
            scheduleScan()
            return
          }
        }
      })
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      scheduleScan()
    }

    // ------------------------------------------------------------ hover card

    const HOVER_DELAY = 170
    const LEAVE_DELAY = 110
    let hoverTimer = 0
    let leaveTimer = 0

    function clearTimers() {
      if (hoverTimer) window.clearTimeout(hoverTimer)
      if (leaveTimer) window.clearTimeout(leaveTimer)
      hoverTimer = 0
      leaveTimer = 0
    }

    function showCard(el) {
      const id = el.getAttribute('data-cw')
      const entry = ENTRY_BY_ID.get(id)
      if (!entry) return
      const rect = el.getBoundingClientRect()
      store.set({
        tooltip: {
          id,
          left: rect.left + rect.width / 2,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
        },
      })
    }

    function hideCard() {
      if (store.get().tooltip) store.set({ tooltip: null })
    }

    function onPointerOver(event) {
      const target = event.target
      if (!target || target.nodeType !== 1) return
      const el = target.closest ? target.closest('.cw-hl') : null
      if (!el) return
      clearTimers()
      hoverTimer = window.setTimeout(() => showCard(el), HOVER_DELAY)
    }

    function onPointerOut(event) {
      const target = event.target
      if (!target || target.nodeType !== 1) return
      const el = target.closest ? target.closest('.cw-hl') : null
      if (!el) return
      const next = event.relatedTarget
      if (next && next.nodeType === 1 && next.closest && next.closest('.cw-hl') === el) return
      clearTimers()
      leaveTimer = window.setTimeout(hideCard, LEAVE_DELAY)
    }

    function onHighlightClick(event) {
      const target = event.target
      if (!target || target.nodeType !== 1) return
      const el = target.closest ? target.closest('.cw-hl') : null
      if (!el) return
      const id = el.getAttribute('data-cw')
      if (!id) return
      const entry = ENTRY_BY_ID.get(id)
      // Anchor the context sentence on the spelling that was actually clicked,
      // so an alias such as "GPT-4o" still locates its own sentence.
      const surface = (el.textContent || '').trim() || (entry ? entry.term : '')
      let block = el.parentElement
      while (block && !BLOCK_TAGS[block.tagName]) block = block.parentElement
      const context = block ? sentenceAround(block.textContent, surface) : ''
      event.preventDefault()
      event.stopPropagation()
      clearTimers()
      openTerm(id, context, 'message', true)
    }

    // -------------------------------------------------------- selection menu

    const MAX_SELECTION = 140
    let menuText = ''

    function selectionText() {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) return ''
      const text = String(selection.toString() || '').replace(/\s+/g, ' ').trim()
      if (!text || text.length > MAX_SELECTION) return ''
      return text
    }

    /**
     * The previous non-empty selection. A right press can collapse the DOM
     * selection before `contextmenu` fires, so the text captured while the user
     * was still dragging is used as a fallback.
     */
    let lastSelectionText = ''

    function onSelectionChange() {
      const text = selectionText()
      if (text) lastSelectionText = text
    }

    function onContextMenu(event) {
      const target = event.target
      if (!target || target.nodeType !== 1) return
      if (target.closest('[data-cw-ui]')) return
      if (target.closest('input, textarea, [contenteditable="true"]')) return
      const text = selectionText() || lastSelectionText
      if (!text) return
      event.preventDefault()
      menuText = text
      store.set({ menu: { x: event.clientX, y: event.clientY, text }, tooltip: null })
    }

    function onDocumentPointerDown(event) {
      const menu = store.get().menu
      if (menu) {
        const target = event.target
        const inside = target && target.nodeType === 1 && target.closest('.cw-menu')
        if (!inside) store.set({ menu: null })
      }
      // Keep the fallback only across the right press that opens the menu.
      if (event.button !== 2) lastSelectionText = ''
    }

    async function copyText(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text)
          return true
        }
      } catch (error) {
        /* fall through to the selection-based copy */
      }
      try {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', 'readonly')
        area.style.position = 'fixed'
        area.style.top = '-1000px'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        const ok = document.execCommand('copy')
        if (area.parentNode) area.parentNode.removeChild(area)
        return ok
      } catch (error) {
        return false
      }
    }

    function onKeyDown(event) {
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key === 'ArrowLeft') {
        if (goBack()) {
          event.preventDefault()
          event.stopPropagation()
        }
        return
      }
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key === 'ArrowRight') {
        if (goForward()) {
          event.preventDefault()
          event.stopPropagation()
        }
        return
      }
      if (event.key !== 'Escape') return
      const state = store.get()
      if (state.menu) {
        store.set({ menu: null })
        return
      }
      if (state.panel) {
        closePanel()
        return
      }
      if (state.bankOpen) {
        closeBank()
        return
      }
      if (state.tooltip) store.set({ tooltip: null })
    }

    function onGlobalScroll() {
      clearTimers()
      const state = store.get()
      if (state.tooltip || state.menu) store.set({ tooltip: null, menu: null })
    }

    function onWindowResize() {
      onGlobalScroll()
      store.set({ viewportTick: Date.now() })
    }

    /** Another window wrote the bank: take its copy instead of overwriting it. */
    function onStorage(event) {
      if (event && event.key !== BANK_KEY) return
      loadBank()
      store.set({ bankTick: Date.now() })
    }

    let lastBackAt = 0

    /**
     * Mouse back button. Chromium reports it as button 3; the default action is
     * also suppressed so the frame's own history navigation never fires by
     * accident while the pane is open.
     */
    function onMouseBack(event) {
      if (event.button !== 3 && event.button !== 4) return
      if (event.cancelable) event.preventDefault()
      event.stopPropagation()
      if (event.type !== 'mouseup') return
      const now = Date.now()
      if (now - lastBackAt < 150) return
      lastBackAt = now
      if (event.button === 3) goBack()
      else goForward()
    }

    // ------------------------------------------------------ selection lookup

    function normalizeSelection(text) {
      return String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, '')
    }

    function resolveSelection(text) {
      const cleaned = normalizeSelection(text)
      if (!cleaned) return null
      const direct = SURFACE_BY_LOWER.get(cleaned.toLowerCase())
      if (direct) return direct
      const lower = cleaned.toLowerCase()
      const singular = [
        lower.replace(/['’]s$/, ''),
        lower.replace(/ies$/, 'y'),
        lower.replace(/(es|s)$/, ''),
      ]
      for (const form of singular) {
        const hit = SURFACE_BY_LOWER.get(form)
        if (hit) return hit
      }
      if (/[\s\-_/]/.test(cleaned)) {
        const parts = cleaned.split(/[\s\-_/]+/).filter((part) => part.length > 2)
        for (const part of parts) {
          const hit = SURFACE_BY_LOWER.get(part.toLowerCase())
          if (hit) return hit
        }
      }
      return null
    }

    const SHAPE_RULES = [
      { re: /(tion|sion|ment|ness|ity|ance|ence|ism|ship|hood|age)$/i, en: 'noun ending', id: 'akhiran kata benda' },
      { re: /(ize|ise|ify|ate|en)$/i, en: 'verb ending', id: 'akhiran kata kerja' },
      { re: /(ous|ive|able|ible|ical|ish|less|ful)$/i, en: 'adjective ending', id: 'akhiran kata sifat' },
      { re: /ly$/i, en: 'adverb ending', id: 'akhiran kata keterangan' },
      { re: /(ing|ed)$/i, en: 'verb form', id: 'bentuk verba' },
    ]

    const AFFIX_PREFIX = /^(me|mem|men|meng|meny|ber|be|ter|di|ke|se|pe|per|pen|peng|peny)/i
    const AFFIX_SUFFIX = /(kan|nya|lah|kah|an)$/i

    function shapeNote(word, lang) {
      const lower = String(word || '').trim()
      if (!lower || /\s/.test(lower)) return ''
      for (const rule of SHAPE_RULES) {
        if (rule.re.test(lower)) return rule[lang] || rule.en
      }
      if (AFFIX_PREFIX.test(lower) && AFFIX_SUFFIX.test(lower)) {
        return lang === 'id' ? 'kata berimbuhan (awalan dan akhiran)' : 'affixed word (prefix and suffix)'
      }
      if (AFFIX_PREFIX.test(lower)) return lang === 'id' ? 'kata berimbuhan (awalan)' : 'affixed word (prefix)'
      if (AFFIX_SUFFIX.test(lower)) return lang === 'id' ? 'kata berimbuhan (akhiran)' : 'affixed word (suffix)'
      return ''
    }

    function nearbyTerms(context, excludeId) {
      const found = []
      for (const match of findMatches(context || '')) {
        if (match.entry.id === excludeId) continue
        if (found.some((entry) => entry.id === match.entry.id)) continue
        found.push(match.entry)
      }
      return found
    }

    function sessionLabel(id, lang) {
      if (!id) return lang === 'id' ? 'tanpa sesi' : 'no session'
      const title = sessionTitles[id]
      if (title && String(title).trim()) {
        const text = String(title).trim()
        return text.length > 26 ? text.slice(0, 26) + '…' : text
      }
      return id.slice(0, 8) + '…'
    }

    function jumpToSession(id) {
      if (!id || !services.uiWorkspace) return
      try {
        services.uiWorkspace.openSession(id)
      } catch (error) {
        /* the id may belong to a session this profile no longer holds */
      }
    }

    // ------------------------------------------------------------------ css

    const CSS = `
.cw-hl {
  color: var(--dsw-alias-brand-primary, #1f6feb);
  border-bottom: 1px dotted color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 60%, transparent);
  border-radius: 3px;
  padding: 0 1px;
  cursor: pointer;
  text-decoration: none;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  transition: background-color 120ms ease;
}
.cw-hl:hover {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 15%, transparent);
}
.cw-hl[data-kind="product"] {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 9%, transparent);
  border-bottom-style: solid;
  border-bottom-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 35%, transparent);
}
.cw-hl[data-kind="product"]:hover {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 19%, transparent);
}
.cw-ui {
  display: contents;
}
.cw-tip {
  position: fixed;
  z-index: 9060;
  width: 318px;
  max-width: calc(100vw - 24px);
  padding: 10px 12px 11px;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  color: var(--dsw-alias-label-primary, #1a1a1a);
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12));
  border-radius: 10px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, .18), 0 2px 8px rgba(0, 0, 0, .10);
  font-size: 12.5px;
  line-height: 1.55;
  pointer-events: none;
}
.cw-tip-head {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-bottom: 5px;
}
.cw-tip-term {
  font-weight: 600;
  font-size: 13px;
  letter-spacing: .01em;
}
.cw-tip-short {
  color: var(--dsw-alias-label-secondary, #5b5b5b);
}
.cw-tip-example {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.10));
  color: var(--dsw-alias-label-secondary, #5b5b5b);
  font-style: italic;
}
.cw-tip-hint {
  margin-top: 6px;
  font-size: 11px;
  color: var(--dsw-alias-state-idle-primary, #8a8a8a);
}
.cw-menu {
  position: fixed;
  z-index: 9120;
  min-width: 172px;
  padding: 5px;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  color: var(--dsw-alias-label-primary, #1a1a1a);
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12));
  border-radius: 9px;
  box-shadow: 0 16px 38px rgba(0, 0, 0, .20), 0 2px 8px rgba(0, 0, 0, .10);
  font-size: 12.5px;
  pointer-events: auto;
}
.cw-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 6px 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.cw-menu-item:hover {
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #000) 8%, transparent);
}
.cw-menu-keys {
  font-size: 11px;
  color: var(--dsw-alias-state-idle-primary, #8a8a8a);
}
.cw-panel {
  position: fixed;
  top: 56px;
  height: auto;
  max-height: calc(100vh - 70px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1a1a1a);
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12));
  border-radius: 12px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, .22), 0 4px 14px rgba(0, 0, 0, .10);
  pointer-events: auto;
  font-size: 13px;
  line-height: 1.6;
  animation: cw-slide 170ms ease-out;
}
@keyframes cw-slide {
  from { transform: translateX(18px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.cw-panel-head {
  flex: none;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 15px 12px 12px 16px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.10));
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-2, #fafafa));
}
.cw-panel-head-main {
  flex: 1 1 auto;
  min-width: 0;
}
.cw-panel-term {
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -.01em;
  word-break: break-word;
}
.cw-panel-en {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
}
.cw-icon-btn {
  flex: none;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}
.cw-icon-btn:hover {
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #000) 8%, transparent);
  color: var(--dsw-alias-label-primary, #1a1a1a);
}
.cw-body {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 16px 22px;
}
/* The bank pins its first card to the top edge so the letter rail starts flush
   with it instead of floating below a strip of padding. */
.cw-body-flush {
  padding-top: 0;
}
.cw-body-flush .cw-row:first-of-type {
  margin-top: 0;
}
.cw-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}
.cw-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 550;
  letter-spacing: .01em;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #000) 7%, transparent);
  white-space: nowrap;
}
.cw-chip-brand {
  color: var(--dsw-alias-brand-primary, #1f6feb);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 13%, transparent);
}
.cw-sec {
  margin-top: 16px;
}
.cw-sec-title {
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
  margin-bottom: 5px;
}
.cw-text {
  color: var(--dsw-alias-label-primary, #1a1a1a);
  /* Pinned, not inherited: the body must read the same in every language. */
  font-size: 13px;
  line-height: 1.62;
}
.cw-quote {
  padding: 8px 11px;
  border-left: 2px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 45%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #000) 4%, transparent);
  border-radius: 0 7px 7px 0;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
  font-style: italic;
}
.cw-context {
  color: var(--dsw-alias-label-secondary, #5b5b5b);
}
.cw-list {
  margin: 0;
  padding-left: 17px;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
}
.cw-list li {
  margin-bottom: 3px;
}
.cw-inline {
  display: inline;
  padding: 0 1px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--dsw-alias-brand-primary, #1f6feb);
  font: inherit;
  text-align: left;
  border-bottom: 1px dotted color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 60%, transparent);
  cursor: pointer;
}
.cw-inline:hover {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 15%, transparent);
}
.cw-lang {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.10));
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2, #fafafa);
}
.cw-langbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.cw-lang-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .05em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
}
.cw-langbtn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12));
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1a1a1a);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.cw-langbtn:hover {
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 45%, transparent);
}
.cw-langbtn-code {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .05em;
  color: var(--dsw-alias-brand-primary, #1f6feb);
}
.cw-langbtn-label {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cw-langpop {
  z-index: 40;
  max-height: 264px;
  overflow-y: auto;
}
.cw-langopt {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cw-langopt-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cw-langopt-tick {
  flex: none;
  font-size: 11px;
  font-weight: 700;
  color: var(--dsw-alias-brand-primary, #1f6feb);
}
.cw-langopt-code {
  display: inline-block;
  min-width: 22px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .04em;
  color: var(--dsw-alias-state-idle-primary, #8a8a8a);
}
.cw-langpop .cw-pop-on .cw-langopt-code {
  color: inherit;
}
.cw-switch {
  display: inline-flex;
  gap: 4px;
  padding: 2px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #000) 7%, transparent);
}
.cw-switch-btn {
  min-width: 38px;
  padding: 3px 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
  font-size: 11.5px;
  font-weight: 650;
  letter-spacing: .04em;
  cursor: pointer;
}
.cw-switch-btn[aria-checked="true"] {
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1a1a1a);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .14);
}
.cw-foot {
  margin-top: 18px;
  padding-top: 10px;
  border-top: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
  font-size: 11px;
  color: var(--dsw-alias-state-idle-primary, #8a8a8a);
}
.cw-topbar {
  flex: none;
  padding: 12px 16px 8px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));
}
.cw-count {
  margin-left: 8px;
  vertical-align: middle;
  font-size: 10px;
}
.cw-filterbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
}
.cw-menu-wrap {
  position: relative;
}
.cw-toolbtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12));
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.cw-toolbtn:hover {
  color: var(--dsw-alias-label-primary, #1a1a1a);
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 45%, transparent);
}
.cw-pop {
  position: absolute;
  z-index: 20;
  top: calc(100% + 4px);
  left: 0;
  min-width: 172px;
  padding: 4px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12));
  border-radius: 9px;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  box-shadow: 0 12px 30px rgba(0, 0, 0, .16), 0 2px 6px rgba(0, 0, 0, .08);
}
.cw-menu-wrap:last-child .cw-pop {
  left: auto;
  right: 0;
}
.cw-pop-item {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 6px 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.cw-pop-item:hover {
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #000) 8%, transparent);
}
.cw-pop-on {
  color: var(--dsw-alias-brand-primary, #1f6feb);
  font-weight: 600;
}
.cw-toast {
  position: absolute;
  left: 50%;
  bottom: 16px;
  z-index: 30;
  max-width: 82%;
  padding: 7px 12px;
  border-radius: 8px;
  background: var(--dsw-alias-label-primary, #1a1a1a);
  color: var(--dsw-alias-bg-layer-1, #ffffff);
  font-size: 11.5px;
  line-height: 1.4;
  text-align: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, .20);
  pointer-events: none;
  animation: cw-toast-in 150ms ease-out;
}
@keyframes cw-toast-in {
  from { opacity: 0; transform: translate(-50%, 8px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
.cw-hero {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px 18px;
}
.cw-mark {
  flex: none;
  display: block;
  color: var(--dsw-alias-label-primary, #1a1a1a);
}
.cw-hero-brand {
  display: flex;
  align-items: center;
  gap: 9px;
}
.cw-hero-title {
  font-size: 19px;
  font-weight: 650;
  letter-spacing: -.015em;
}
.cw-hero-composer {
  width: 100%;
  max-width: 320px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px 9px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12));
  border-radius: 14px;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  box-shadow: 0 2px 10px rgba(0, 0, 0, .07);
}
.cw-hero-input {
  width: 100%;
  box-sizing: border-box;
  padding: 5px 2px;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-primary, #1a1a1a);
  font: inherit;
  font-size: 13px;
  outline: none;
}
.cw-hero-input::placeholder {
  color: var(--dsw-alias-state-idle-primary, #8a8a8a);
}
.cw-hero-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cw-hero-left {
  display: flex;
  align-items: center;
  gap: 4px;
}
.cw-hero-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
  cursor: pointer;
}
.cw-hero-icon:hover {
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #000) 8%, transparent);
  color: var(--dsw-alias-label-primary, #1a1a1a);
}
.cw-hero-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
}
.cw-hero-action:hover {
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #000) 8%, transparent);
  color: var(--dsw-alias-label-primary, #1a1a1a);
}
.cw-hero-pop {
  top: auto;
  bottom: calc(100% + 6px);
  left: 0;
  right: auto;
  min-width: 208px;
  padding: 6px;
  z-index: 45;
}
.cw-hero-pop-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 8px 7px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.10));
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--dsw-alias-state-idle-primary, #8a8a8a);
}
.cw-hero-pop-value {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #1a1a1a);
}
.cw-hero-pop-list {
  max-height: 232px;
  margin-top: 4px;
  overflow-y: auto;
}
.cw-hero-send {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: var(--dsw-alias-brand-primary, #1f6feb);
  color: #ffffff;
  cursor: pointer;
}
.cw-hero-send:hover {
  filter: brightness(1.07);
}
.cw-search {
  width: 100%;
  box-sizing: border-box;
  margin: 10px 0 0;
  padding: 7px 10px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12));
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2, #fafafa);
  color: var(--dsw-alias-label-primary, #1a1a1a);
  font: inherit;
  font-size: 12.5px;
}
.cw-search:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 55%, transparent);
}
.cw-row {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 9px 10px;
  margin-top: 6px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.09));
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-2, #fafafa);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.cw-row:hover {
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 45%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 7%, transparent);
}
.cw-row-head {
  display: flex;
  align-items: baseline;
  gap: 7px;
}
.cw-row-term {
  font-weight: 650;
  font-size: 13.5px;
}
.cw-chip-lang {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .06em;
  padding: 1px 4px;
  opacity: .7;
}
.cw-row-gloss {
  margin-top: 2px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cw-row-meta {
  margin-top: 4px;
  font-size: 10.5px;
  letter-spacing: .01em;
  color: var(--dsw-alias-state-idle-primary, #8a8a8a);
}
.cw-empty {
  margin-top: 14px;
  font-size: 12.5px;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
}
.cw-hist-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
}
.cw-hist-dot {
  width: 5px;
  height: 5px;
  flex: none;
  border-radius: 50%;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 70%, transparent);
}
.cw-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 6px 12px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 40%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 11%, transparent);
  color: var(--dsw-alias-brand-primary, #1f6feb);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.cw-btn:hover {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 20%, transparent);
}
.cw-session-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  margin-top: 4px;
  padding: 3px 9px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12));
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
}
.cw-session-btn:hover {
  color: var(--dsw-alias-label-primary, #1a1a1a);
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 45%, transparent);
}
.cw-launcher {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.cw-launcher:hover {
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #000) 8%, transparent);
  color: var(--dsw-alias-label-primary, #1a1a1a);
}
/* Docked variant: fills the native right-sidebar tab instead of floating. */
.cw-dockwrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.cw-dock {
  position: relative;
  top: auto;
  right: auto;
  left: auto;
  width: 100%;
  height: 100%;
  max-height: none;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
  animation: none;
}
.cw-dock-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  text-align: center;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary, #5b5b5b);
}
.cw-mainwrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}
.cw-bank-body {
  display: flex;
  align-items: flex-start;
}
.cw-bank-list {
  flex: 0 0 97.5%;
  min-width: 0;
}
.cw-alpha {
  position: absolute;
  top: 0;
  bottom: 10px;
  right: calc(2px + 1.25%);
  width: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.10));
  border-radius: 9px;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #fff) 62%, transparent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .07);
  user-select: none;
}
.cw-alpha-lift {
  position: absolute;
  left: 2px;
  right: 2px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #1f6feb) 22%, transparent);
  transition: top 240ms cubic-bezier(.22, .61, .36, 1), height 180ms ease, opacity 140ms ease;
  pointer-events: none;
}
.cw-alpha-letter {
  position: relative;
  z-index: 1;
  font-size: 10px;
  font-weight: 400;
  line-height: 1;
  color: var(--dsw-alias-state-idle-primary, #8a8a8a);
  cursor: pointer;
  transition: color 120ms ease;
}
.cw-alpha-letter:hover {
  font-weight: 700;
  color: var(--dsw-alias-brand-primary, #1f6feb);
}
.cw-source {
  margin-top: 6px;
  font-size: 10.5px;
  letter-spacing: .02em;
  color: var(--dsw-alias-state-idle-primary, #8a8a8a);
}
.cw-dots {  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 16px;
}
.cw-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  opacity: .45;
  animation: cw-bounce 900ms ease-in-out infinite;
}
.cw-dots span:nth-child(2) {
  animation-delay: 150ms;
}
.cw-dots span:nth-child(3) {
  animation-delay: 300ms;
}
@keyframes cw-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: .45; }
  40% { transform: translateY(-4px); opacity: 1; }
}
/* --- harness turn-navigation rail, mirrored to the left edge -------------
   The harness ships the turn minimap on the transcript's right edge inside
   its own absolutely positioned slot. Re-docking the slot and the rail moves
   the whole widget, hover preview included, to the left of the column. The
   second pair of selectors is the hashed-class fallback in case the harness
   ever localises the aria-label. */
div:has(> nav[aria-label='Turn navigation']) {
  right: auto !important;
  left: 6px !important;
}
nav[aria-label='Turn navigation'] {
  right: auto !important;
  left: 0 !important;
}
div:has(> nav.SNx2jG_frame) {
  right: auto !important;
  left: 6px !important;
}
nav.SNx2jG_frame {
  right: auto !important;
  left: 0 !important;
}
`

    // ----------------------------------------------------------- components

    /**
     * Close a popover as soon as the pointer lands anywhere outside a menu
     * wrapper. Using pointerdown in the capture phase means the popover is gone
     * before whatever was underneath reacts.
     */
    function useDismissPopover(open, close) {
      React.useEffect(() => {
        if (!open) return undefined
        const onDown = (event) => {
          const target = event.target
          if (target instanceof Element && target.closest('.cw-menu-wrap')) return
          close()
        }
        document.addEventListener('pointerdown', onDown, true)
        return () => document.removeEventListener('pointerdown', onDown, true)
      }, [open, close])
    }

    const hIcon = (path, extra) =>
      h(
        'svg',
        Object.assign(
          { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
          extra || {},
        ),
        path.map((d, i) => h('path', { key: i, d })),
      )

    const BOOK_PATH = ['M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z', 'M4 18.5V5.5', 'M9 7.5h6']
    const CROSS_PATH = ['M6 6l12 12', 'M18 6 6 18']
    const COPY_PATH = ['M9 9h10v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z', 'M15 5H6a1 1 0 0 0-1 1v9']
    const QUESTION_PATH = ['M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.6', 'M12 17.2v.1']
    const ARROW_PATH = ['M7 17 17 7', 'M9 7h8v8']
    // Three lines narrowing downward: the conventional filter mark.
    const FILTER_PATH = ['M4 7h16', 'M7 12h10', 'M10 17h4']
    const SORT_PATH = ['M8 5v14', 'M5 16l3 3 3-3', 'M16 19V5', 'M13 8l3-3 3 3']
    const SEND_PATH = ['M12 19V5', 'M6 11l6-6 6 6']
    const CHEVRON_PATH = ['M6 9l6 6 6-6']
    // A gear, drawn as a stroke so it stays legible at 13px.
    const GEAR_PATH = [
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    ]

    function Rich({ text, lang, onPick }) {
      const matches = findMatches(text)
      if (!matches.length) return h('span', null, text)
      const nodes = []
      let cursor = 0
      let key = 0
      for (const match of matches) {
        if (match.start > cursor) nodes.push(h('span', { key: 'p' + key++ }, text.slice(cursor, match.start)))
        const entry = match.entry
        nodes.push(
          h(
            'button',
            {
              key: 't' + key++,
              type: 'button',
              className: 'cw-inline',
              onClick: (event) => {
                event.preventDefault()
                event.stopPropagation()
                onPick(entry, text)
              },
            },
            text.slice(match.start, match.end),
          ),
        )
        cursor = match.end
      }
      if (cursor < text.length) nodes.push(h('span', { key: 'p' + key++ }, text.slice(cursor)))
      return h(React.Fragment, null, nodes)
    }

    function Section({ title, children }) {
      return h('div', { className: 'cw-sec' }, h('div', { className: 'cw-sec-title' }, title), children)
    }

    /** Three dots rising and falling in turn, the plugin's only loading mark. */
    function Dots({ label }) {
      return h(
        'span',
        { className: 'cw-dots', role: 'status', 'aria-label': label || 'loading' },
        h('span', { key: 'a' }),
        h('span', { key: 'b' }),
        h('span', { key: 'c' }),
      )
    }

    function LangBox({ lang, t }) {
      const [open, setOpen] = React.useState(false)
      const [pair, setPair] = React.useState(store.get().langs || DEFAULT_PAIR.slice())
      React.useEffect(
        () => store.subscribe(() => setPair(store.get().langs || DEFAULT_PAIR.slice())),
        [],
      )
      useDismissPopover(open, () => setOpen(false))
      return h(
        'div',
        { className: 'cw-langbar' },
        h(
          'div',
          { className: 'cw-switch', role: 'group', 'aria-label': t.language },
          pair.map((code) => {
            const entry = LANGUAGE_BY_CODE.get(code)
            return h(
              'button',
              {
                key: code,
                type: 'button',
                role: 'switch',
                'aria-checked': code === lang ? 'true' : 'false',
                className: 'cw-switch-btn',
                title: entry ? entry.label : code,
                onClick: () => setLang(code),
              },
              code.toUpperCase(),
            )
          }),
        ),
        h(
          'div',
          { className: 'cw-menu-wrap' },
          h(
            'button',
            {
              type: 'button',
              className: 'cw-icon-btn',
              'aria-haspopup': 'dialog',
              'aria-expanded': open ? 'true' : 'false',
              'aria-label': t.settings,
              title: t.settings,
              onClick: () => setOpen(!open),
            },
            hIcon(GEAR_PATH, { width: 13, height: 13 }),
          ),
          open
            ? h(
                'div',
                { className: 'cw-pop cw-langpop', role: 'dialog', 'aria-label': t.settings },
                h('div', { className: 'cw-hero-pop-head' }, h('span', null, t.pickTwo)),
                h(LanguagePicker, { pair, onToggle: toggleLangPair }),
              )
            : null,
        ),
      )
    }

    function History({ record, lang, t, onJump }) {
      if (!record || (!record.useCount && !record.openCount)) {
        return h('div', { className: 'cw-empty' }, t.none)
      }
      const rows = []
      rows.push(
        h(
          'div',
          { key: 'u', className: 'cw-hist-row' },
          h('span', { className: 'cw-hist-dot' }),
          h('span', null, t.used + ' ' + record.useCount + ' ' + t.times + ' · ' + relTime(record.lastUseAt, lang)),
        ),
      )
      rows.push(
        h(
          'div',
          { key: 'o', className: 'cw-hist-row' },
          h('span', { className: 'cw-hist-dot' }),
          h('span', null, t.opened + ' ' + record.openCount + ' ' + t.times + ' · ' + relTime(record.lastOpenAt, lang)),
        ),
      )
      // Several opens inside the same minute are one moment, not several rows.
      const buckets = new Map()
      for (const open of record.opens) {
        const bucket = Math.floor(open.at / 60000) + '|' + (open.session || '')
        const seen = buckets.get(bucket)
        if (seen) seen.count += 1
        else buckets.set(bucket, { at: open.at, session: open.session, count: 1 })
      }
      const collapsed = Array.from(buckets.values())
        .sort((a, b) => b.at - a.at)
        .slice(0, 3)
      for (const open of collapsed) {
        rows.push(
          h(
            'div',
            { key: 'oe' + open.at + (open.session || ''), className: 'cw-hist-row' },
            h('span', { className: 'cw-hist-dot' }),
            h(
              'span',
              null,
              fmtDateTime(open.at, lang) +
                (open.session ? ' · ' + sessionLabel(open.session, lang) : '') +
                (open.count > 1 ? ' · ' + open.count + t.times : ''),
            ),
          ),
        )
      }
      const sessionIds = Object.keys(record.sessions || {}).sort(
        (a, b) => (record.sessions[b].last || 0) - (record.sessions[a].last || 0),
      )
      if (sessionIds.length) {
        rows.push(
          h(
            'div',
            { key: 'sess', style: { marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' } },
            sessionIds.slice(0, 6).map((id) =>
              h(
                'button',
                { key: id, type: 'button', className: 'cw-session-btn', title: t.jump, onClick: () => onJump(id) },
                hIcon(['M4 12h16', 'M13 5l7 7-7 7'], { width: 11, height: 11 }),
                h('span', null, sessionLabel(id, lang)),
              ),
            ),
          ),
        )
      }
      return h('div', null, rows)
    }

    function TermBody({ entry, layer, lang, t, onPick, onJump, onOpenBank }) {
      const body = []
      const record = bankRecord(entry.id)

      body.push(
        h(
          Section,
          { key: 'def', title: t.definition },
          h('div', { className: 'cw-text' }, h(Rich, { text: pick(entry.definition, lang), lang, onPick })),
        ),
      )
      if (entry.example) {
        body.push(
          h(
            Section,
            { key: 'ex', title: t.inShort },
            h('div', { className: 'cw-quote' }, h(Rich, { text: pick(entry.example, lang), lang, onPick })),
          ),
        )
      }
      if (layer.context) {
        body.push(
          h(
            Section,
            { key: 'ctx', title: t.contextHere },
            h('div', { className: 'cw-context' }, h(Rich, { text: layer.context, lang, onPick })),
          ),
        )
      }
      if (entry.usage && entry.usage.length) {
        body.push(
          h(
            Section,
            { key: 'use', title: t.usage },
            h('ul', { className: 'cw-list' },
              entry.usage.map((item, i) => h('li', { key: 'u' + i }, h(Rich, { text: pick(item, lang), lang, onPick }))),
            ),
          ),
        )
      }
      if (entry.items && entry.items.length) {
        body.push(
          h(
            Section,
            { key: 'items', title: t.items },
            h('div', { className: 'cw-chip-row' }, entry.items.map((item, i) => h('span', { key: 'i' + i, className: 'cw-chip' }, item))),
          ),
        )
      }
      if (entry.related && entry.related.length) {
        const related = entry.related.map((id) => ENTRY_BY_ID.get(id)).filter(Boolean)
        if (related.length) {
          body.push(
            h(
              Section,
              { key: 'rel', title: t.related },
              h('div', { className: 'cw-chip-row' },
                related.map((rel) =>
                  h('button', { key: 'r' + rel.id, type: 'button', className: 'cw-inline', onClick: () => onPick(rel, rel.term) }, rel.term),
                ),
              ),
            ),
          )
        }
      }
      body.push(
        h(Section, { key: 'hist', title: t.history }, h(History, { record, lang, t, onJump })),
      )
      return body
    }

    /* ------------------------------------------------------------ definitions
     * A word outside the built-in glossary is answered by the Host route that
     * asks the configured model. The answer is stored in the word bank keyed by
     * language, so the same word is only ever paid for once: every later open
     * reuses it and only adds the sentence it appeared in.
     */

    function cachedDefinition(id, lang) {
      const record = bankRecord(id)
      return record && record.ai && record.ai[lang] ? record.ai[lang] : null
    }

    /** Older records carried a single definition; treat it as one sense. */
    function sensesOf(answer) {
      if (answer && Array.isArray(answer.senses) && answer.senses.length) return answer.senses
      if (answer && answer.definition) {
        return [{ label: '', definition: answer.definition, example: answer.example || '' }]
      }
      return []
    }

    /* --------------------------------------------------- smart language pick
     * The switch follows the word being read: English terminology opens the
     * English pane, Indonesian prose opens the Indonesian one. A glossary hit is
     * decisive because every built-in entry is English terminology; otherwise
     * the word shape and the surrounding sentence vote.
     */

    const ID_WORDS = 'yang|dan|dengan|untuk|dari|ini|itu|adalah|tidak|sudah|belum|akan|pada|juga|bisa|karena|dalam|atau|saya|kamu|kita|mereka|kalau|tapi|agar|oleh|saat|masih|lebih|paling|seperti|secara|hanya|masalah'
    const EN_WORDS = 'the|and|with|for|from|this|that|are|was|were|have|has|not|but|you|they|can|will|which|when|into|than|then|there|these|those|about|would|should'

    function detectLanguage(word, context) {
      const text = String(word || '').trim()
      if (!text) return ''
      const lower = text.toLowerCase()
      if (SURFACE_BY_LOWER.has(lower)) return 'en'
      let idScore = 0
      let enScore = 0
      if (/(nya|lah|kah|kan)$/.test(lower)) idScore += 3
      if (/^(me|mem|men|meng|meny|ber|ter|pen|peng|peny|per)[a-z]{4,}$/.test(lower) && lower.length >= 8) {
        idScore += 2
      }
      if (/^[a-z][a-z'’-]*$/.test(lower) && lower.length > 2) enScore += 1
      const body = String(context || '')
      if (body) {
        const id = body.match(new RegExp('\\b(' + ID_WORDS + ')\\b', 'gi'))
        const en = body.match(new RegExp('\\b(' + EN_WORDS + ')\\b', 'gi'))
        idScore += id ? id.length : 0
        enScore += en ? en.length : 0
      }
      if (idScore === enScore) return ''
      return idScore > enScore ? 'id' : 'en'
    }

    /** Move the switch to the language the reader is actually looking at. */
    function syncLanguage(word, context) {
      const state = store.get()
      const pair = state.langs || DEFAULT_PAIR.slice()
      const current = state.lang
      // The detector only tells English from Indonesian, so it must never
      // overrule a language the reader chose deliberately.
      if (current !== 'en' && current !== 'id') return
      const detected = detectLanguage(word, context)
      if (!detected || detected === current) return
      // Switching outside the configured pair would leave the two-button switch
      // with nothing selected, so stay put instead.
      if (!pair.includes(detected)) return
      setLang(detected)
    }

    function storeDefinition(id, term, lang, payload) {
      const record = ensureWord(id, term)
      if (!record.ai) record.ai = {}
      record.ai[lang] = payload
      saveBankSoon()
    }

    async function requestDefinition(term, context, lang) {
      const location = window.location
      if (!location || location.protocol === 'file:') {
        throw new Error('the page is not served over HTTP')
      }
      const response = await fetch('/complex-words/define', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ term, context, lang }),
      })
      let payload = null
      try {
        payload = await response.json()
      } catch (error) {
        payload = null
      }
      if (!response.ok || !payload || payload.error) {
        throw new Error((payload && payload.error) || 'HTTP ' + response.status)
      }
      return payload
    }

    function RawBody({ layer, lang, t, onPick, onJump }) {
      const key = rawKey(layer.text)
      const [answer, setAnswer] = React.useState(() => cachedDefinition(key, lang))
      const [status, setStatus] = React.useState(() => (cachedDefinition(key, lang) ? 'ready' : 'loading'))
      const [failure, setFailure] = React.useState('')
      const [attempt, setAttempt] = React.useState(0)
      const [senseIndex, setSenseIndex] = React.useState(0)

      React.useEffect(() => {
        const cached = cachedDefinition(key, lang)
        if (cached) {
          setAnswer(cached)
          setStatus('ready')
          setFailure('')
          return undefined
        }
        let cancelled = false
        setAnswer(null)
        setStatus('loading')
        setFailure('')
        requestDefinition(layer.text, layer.context || '', lang)
          .then((payload) => {
            if (cancelled) return
            storeDefinition(key, layer.text, lang, payload)
            setAnswer(payload)
            setStatus('ready')
          })
          .catch((error) => {
            if (cancelled) return
            setStatus('error')
            setFailure(error && error.message ? error.message : 'unknown error')
          })
        return () => {
          cancelled = true
        }
      }, [key, lang, attempt])

      React.useEffect(() => {
        setSenseIndex(0)
      }, [answer])

      const body = []
      const record = bankRecord(key)
      const shape = shapeNote(layer.text, lang)
      const nearby = nearbyTerms((layer.context || '') + ' ' + layer.text, null)

      if (answer) {
        const senses = sensesOf(answer)
        const active = senses[Math.min(senseIndex, Math.max(0, senses.length - 1))] || null
        const shownDefinition = active ? active.definition : answer.definition
        body.push(
          h(
            Section,
            { key: 'def', title: t.definition },
            active && active.label
              ? h('div', { className: 'cw-chip-row' }, h('span', { className: 'cw-chip cw-chip-brand' }, active.label))
              : null,
            h('div', { className: 'cw-text' }, h(Rich, { text: shownDefinition, lang, onPick })),
            h(
              'div',
              { className: 'cw-source' },
              t.sourcePrefix + ' ' +
                (answer.source === 'dictionary' ? answer.attribution || 'Wiktionary' : 'model'),
            ),
          ),
        )
        const shownExample = (active && active.example) || answer.example
        if (shownExample) {
          body.push(
            h(
              Section,
              { key: 'ex', title: t.inShort },
              h('div', { className: 'cw-quote' }, h(Rich, { text: shownExample, lang, onPick })),
            ),
          )
        }
        if (senses.length > 1) {
          body.push(
            h(
              Section,
              { key: 'senses', title: t.otherSenses },
              h(
                'div',
                null,
                senses.map((sense, i) =>
                  i === senseIndex
                    ? null
                    : h(
                        'button',
                        {
                          key: 'sense' + i,
                          type: 'button',
                          className: 'cw-row',
                          onClick: () => setSenseIndex(i),
                        },
                        h(
                          'div',
                          { className: 'cw-row-head' },
                          h('span', { className: 'cw-row-term' }, sense.label || t.definition),
                        ),
                        h('div', { className: 'cw-row-gloss' }, sense.definition),
                      ),
                ),
              ),
            ),
          )
        }
        if (answer.usage && answer.usage.length) {
          body.push(
            h(
              Section,
              { key: 'use', title: t.usage },
              h(
                'ul',
                { className: 'cw-list' },
                answer.usage.map((item, i) => h('li', { key: 'u' + i }, h(Rich, { text: item, lang, onPick }))),
              ),
            ),
          )
        }
      } else if (status === 'loading') {
        body.push(
          h(Section, { key: 'loading', title: t.definition }, h('div', { className: 'cw-empty' }, h(Dots, { label: t.loading }))),
        )
      } else {
        body.push(
          h(
            Section,
            { key: 'failed', title: t.definition },
            h('div', { className: 'cw-empty' }, t.aiError + ' (' + failure + ')'),
            h('button', { key: 'retry', type: 'button', className: 'cw-btn', onClick: () => setAttempt(attempt + 1) }, t.retry),
          ),
        )
      }

      if (layer.context) {
        body.push(
          h(Section, { key: 'ctx', title: t.contextHere }, h('div', { className: 'cw-quote' }, layer.context)),
        )
      }
      if (shape) {
        body.push(h(Section, { key: 'shape', title: t.shape }, h('div', { className: 'cw-text' }, shape)))
      }
      if (nearby.length) {
        body.push(
          h(
            Section,
            { key: 'near', title: t.nearby },
            h('div', { className: 'cw-chip-row' },
              nearby.slice(0, 8).map((entry) =>
                h('button', { key: entry.id, type: 'button', className: 'cw-inline', onClick: () => onPick(entry, entry.term) }, entry.term),
              ),
            ),
          ),
        )
      }
      if (!record) {
        body.push(
          h(
            'button',
            {
              key: 'save',
              type: 'button',
              className: 'cw-btn',
              onClick: () => {
                ensureWord(key, layer.text)
                recordOpen(key, layer.text, currentSession(), 'selection')
              },
            },
            t.save,
          ),
        )
      }
      body.push(h(Section, { key: 'hist', title: t.history }, h(History, { record, lang, t, onJump })))
      return body
    }

    function BankBody({ lang, t, onPick, query, filter, sort }) {
      const all = bankEntries()
      const needle = String(query || '').trim().toLowerCase()
      const matches = (record) => {
        if (needle && !record.term.toLowerCase().includes(needle)) return false
        const entry = ENTRY_BY_ID.get(record.id)
        if (filter === 'term') return Boolean(entry) && entry.kind === 'term'
        if (filter === 'product') return Boolean(entry) && entry.kind === 'product'
        if (filter === 'unknown') return !entry
        if (filter === 'opened') return record.openCount > 0
        if (filter === 'unopened') return record.openCount === 0
        return true
      }
      const list = all.filter(matches)
      if (sort === 'name') list.sort((a, b) => a.term.localeCompare(b.term))
      const rows = list.slice(0, 120).map((record) => {
        const entry = ENTRY_BY_ID.get(record.id)
        const gloss = entry ? pick(entry.short, lang) : t.unknown
        const kindLabel = entry ? (entry.kind === 'product' ? t.product : t.term) : t.unknown
        // The bank is one vocabulary; only the gloss has a language, and it is
        // English whenever the active language has no translation to offer.
        const glossLang = entry
          ? entry.short && entry.short[lang]
            ? lang
            : 'en'
          : record.ai && record.ai[lang]
            ? lang
            : ''
        return h(
          'button',
          { key: record.id, type: 'button', className: 'cw-row', 'data-term': record.term, onClick: () => onPick(record) },
          h(
            'div',
            { className: 'cw-row-head' },
            h('span', { className: 'cw-row-term' }, record.term),
            h('span', { className: 'cw-chip' }, kindLabel),
            glossLang ? h('span', { className: 'cw-chip cw-chip-lang' }, glossLang.toUpperCase()) : null,
          ),
          h('div', { className: 'cw-row-gloss' }, gloss),
          h(
            'div',
            { className: 'cw-row-meta' },
            t.used + ' ' + record.useCount + t.times + '  ·  ' + t.opened + ' ' + record.openCount + t.times +
              '  ·  ' + (Object.keys(record.sessions || {}).length) + ' ' + t.sessions.toLowerCase(),
          ),
        )
      })
      return rows.length
        ? h(
            'div',
            { className: 'cw-bank-body' },
            h('div', { className: 'cw-bank-list' }, rows),
          )
        : h('div', { className: 'cw-empty' }, all.length ? t.bankNoMatch : t.bankEmpty)
    }

    /**
     * Anchor the pane just right of the left sidebar. `main` is normally the
     * conversation column, but it can also be the whole frame or another
     * column, so an implausible offset falls back to a standard sidebar width
     * instead of pushing the pane off screen.
     */
    function mainLeftEdge() {
      const fallback = 200
      const viewport = window.innerWidth || 1400
      const el = document.querySelector('main') || document.querySelector('[role="main"]')
      if (!el) return fallback
      try {
        const left = Math.round(el.getBoundingClientRect().left)
        if (!Number.isFinite(left)) return fallback
        if (left < 56 || left > viewport * 0.4) return fallback
        return left
      } catch (error) {
        return fallback
      }
    }

    /**
     * The transcript scroller is the region between the top bar and the
     * composer, so its rect is the boundary a docked panel must respect.
     */
    function transcriptBox() {
      const el = document.querySelector('[class*="_scrollBody"]')
      if (!el) return null
      try {
        const rect = el.getBoundingClientRect()
        if (!rect || rect.width < 160 || rect.height < 120) return null
        return rect
      } catch (error) {
        return null
      }
    }

    // Both surfaces live in the right column. The definition pane takes a share
    // of the frame width so it stays inside the transcript's right gutter at any
    // window size; the bank is allowed to overlap and keeps a fixed width.
    const styleCache = { key: '', value: null }

    const PANE_SHARE = 0.1535

    function panelStyle(width, shift) {
      const tick = store.get().viewportTick
      const key = width + ':' + (shift || 0) + ':' + tick
      if (styleCache.key === key) return styleCache.value
      const viewportW = window.innerWidth || 1400
      const viewportH = window.innerHeight || 800
      const box = transcriptBox()
      const top = box ? Math.max(8, Math.round(box.top) + 6) : Math.round(viewportH * 0.095)
      const bottomGap = box ? Math.max(8, Math.round(viewportH - box.bottom) + 6) : 12
      const w = shift
        ? width
        : Math.max(260, Math.min(width, Math.round(viewportW * PANE_SHARE)))
      const value = {
        right: 3 + (shift || 0) + 'px',
        left: 'auto',
        top: top + 'px',
        width: w + 'px',
        maxHeight: Math.max(180, viewportH - top - bottomGap) + 'px',
        zIndex: 9020,
      }
      styleCache.key = key
      styleCache.value = value
      return value
    }

    /**
     * The A–Z index as one card. A highlight block slides to the letter under
     * the pointer, so the rail reads as a single control rather than 26 labels.
     */
    function AlphaRail({ onMiss }) {
      const [lift, setLift] = React.useState(null)
      return h(
        'div',
        { className: 'cw-alpha', 'aria-hidden': 'true', onMouseLeave: () => setLift(null) },
        h('div', {
          className: 'cw-alpha-lift',
          style: lift
            ? { top: lift.top + 'px', height: lift.height + 'px', opacity: 1 }
            : { opacity: 0 },
        }),
        ALPHABET.map((letter) =>
          h(
            'span',
            {
              key: letter,
              className: 'cw-alpha-letter',
              onClick: (event) => {
                // A letter redirects the list: the first row whose term starts
                // with it is scrolled to the top of the visible area.
                const panel = event.currentTarget.closest('.cw-panel')
                if (!panel) return
                const scroller = panel.querySelector('.cw-body')
                const target = panel.querySelector('[data-term^="' + letter + '" i]')
                if (!scroller) return
                if (!target) {
                  onMiss(letter)
                  return
                }
                const top =
                  target.getBoundingClientRect().top -
                  scroller.getBoundingClientRect().top +
                  scroller.scrollTop -
                  4
                scroller.scrollTo({ top, behavior: 'smooth' })
              },
              onMouseEnter: (event) => {
                const node = event.currentTarget
                // Grow the block past the glyph so it reads as a bar of the
                // index rather than a dot behind one letter.
                const pad = Math.max(5, Math.round(node.offsetHeight * 0.55))
                setLift({ top: node.offsetTop - pad, height: node.offsetHeight + pad * 2 })
              },
            },
            letter,
          ),
        ),
      )
    }

    /**
     * What the dock shows before a word is chosen: a chat-style welcome with one
     * shortcut to the word bank and a few terms worth starting from.
     */
    function DockEmpty({ lang, t, onOpenBank, onSearch }) {
      const [text, setText] = React.useState('')
      const [settingsOpen, setSettingsOpen] = React.useState(false)
      const [pair, setPair] = React.useState(store.get().langs || DEFAULT_PAIR.slice())
      React.useEffect(
        () => store.subscribe(() => setPair(store.get().langs || DEFAULT_PAIR.slice())),
        [],
      )
      useDismissPopover(settingsOpen, () => setSettingsOpen(false))
      const submit = () => onSearch(text.trim())
      return h(
        'div',
        { className: 'cw-hero' },
        h(
          'div',
          { className: 'cw-hero-brand' },
          h(WhaleMark, { size: 30 }),
          h('span', { className: 'cw-hero-title' }, BRAND),
          h('span', { className: 'cw-chip' }, WORDMARK),
        ),
        h(
          'div',
          { className: 'cw-hero-composer' },
          h('input', {
            className: 'cw-hero-input',
            type: 'text',
            value: text,
            placeholder: t.search,
            'aria-label': t.search,
            onChange: (event) => setText(event.target.value),
            onKeyDown: (event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              submit()
            },
          }),
          h(
            'div',
            { className: 'cw-hero-actions' },
            h(
              'div',
              { className: 'cw-hero-left' },
              h(
                'div',
                { className: 'cw-menu-wrap' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'cw-hero-icon',
                    'aria-haspopup': 'dialog',
                    'aria-expanded': settingsOpen ? 'true' : 'false',
                    'aria-label': t.settings,
                    title: t.settings,
                    onClick: () => setSettingsOpen(!settingsOpen),
                  },
                  hIcon(GEAR_PATH, { width: 14, height: 14 }),
                ),
                settingsOpen
                ? h(
                    'div',
                    { className: 'cw-pop cw-hero-pop', role: 'dialog', 'aria-label': t.settings },
                    h('div', { className: 'cw-hero-pop-head' }, h('span', null, t.pickTwo)),
                    h(LanguagePicker, { pair, onToggle: toggleLangPair }),
                  )
                : null,
              ),
              h(
                'button',
                { type: 'button', className: 'cw-hero-action', onClick: onOpenBank },
                hIcon(BOOK_PATH, { width: 13, height: 13 }),
                h('span', null, t.bank),
              ),
            ),
            h(
              'button',
              { type: 'button', className: 'cw-hero-send', onClick: submit, 'aria-label': t.search },
              hIcon(SEND_PATH, { width: 14, height: 14 }),
            ),
          ),
        ),
      )
    }

    function Panel({ layer, width, shift, lang, onClose, dock, initialQuery }) {
      const t = dictFor(lang)
      const style = panelStyle(width, shift)
      const [query, setQuery] = React.useState(initialQuery || '')
      const [filter, setFilter] = React.useState('all')
      const [sort, setSort] = React.useState('name')
      const [openMenu, setOpenMenu] = React.useState('')
      const [notice, setNotice] = React.useState('')
      const noticeTimer = React.useRef(0)
      useDismissPopover(Boolean(openMenu), () => setOpenMenu(''))

      const flashNotice = (letter) => {
        setNotice(letter)
        if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
        noticeTimer.current = window.setTimeout(() => setNotice(''), 1700)
      }
      React.useEffect(
        () => () => {
          if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
        },
        [],
      )
      const onPick = (picked, sourceText) => openTerm(picked.id, sentenceAround(sourceText, picked.term), 'panel')
      const onJump = (id) => jumpToSession(id)

      let title = ''
      let subtitle = ''
      let chips = []
      let body = []

      if (layer.type === 'bank') {
        title = t.bank
        subtitle = t.bankOpen
        chips = []
        body = h(BankBody, {
          lang,
          t,
          query,
          filter,
          sort,
          onPick: (record) => {
            const entry = ENTRY_BY_ID.get(record.id)
            if (entry) openTerm(entry.id, '', 'bank')
            else showPanel({ type: 'raw', text: record.term, context: '' })
          },
        })
      } else if (layer.type === 'raw') {
        title = layer.text
        subtitle = t.unknown
        chips = [h('span', { key: 'q', className: 'cw-chip' }, t.word)]
        body = h(RawBody, { layer, lang, t, onPick, onJump })
      } else {
        const entry = ENTRY_BY_ID.get(layer.id)
        if (!entry) return null
        title = entry.term
        subtitle = entry.kind === 'product' ? t.product : t.term
        chips = []
        if (entry.topic) chips.push(h('span', { key: 'topic', className: 'cw-chip' }, pick(entry.topic, lang)))
        if (entry.vendor) chips.push(h('span', { key: 'vendor', className: 'cw-chip' }, entry.vendor))
        if (entry.categories) {
          for (let i = 0; i < entry.categories.length; i += 1) {
            chips.push(h('span', { key: 'cat' + i, className: 'cw-chip cw-chip-brand' }, pick(entry.categories[i], lang)))
          }
        }
        body = TermBody({ entry, layer, lang, t, onPick, onJump })
      }

      const total = Object.keys(bank.data.words).length
      const head = [
        h(
          'div',
          { key: 'main', className: 'cw-panel-head-main' },
          h(
            'div',
            { className: 'cw-panel-term' },
            title,
            layer.type === 'bank'
              ? h('span', { className: 'cw-chip cw-chip-brand cw-count' }, String(total))
              : null,
          ),
          h('div', { className: 'cw-panel-en' }, subtitle),
        ),
        h(
          'button',
          { key: 'bank', type: 'button', className: 'cw-icon-btn', title: t.bank, 'aria-label': t.bank, onClick: () => toggleBank() },
          hIcon(BOOK_PATH),
        ),
        h(
          'button',
          { key: 'x', type: 'button', className: 'cw-icon-btn', title: t.close, 'aria-label': t.close, onClick: () => onClose() },
          hIcon(CROSS_PATH),
        ),
      ]

      const filterOptions = [
        ['all', t.filterAll],
        ['term', t.filterTerm],
        ['product', t.filterProduct],
        ['unknown', t.filterUnknown],
        ['opened', t.filterOpened],
        ['unopened', t.filterUnopened],
      ]
      const sortOptions = [
        ['date', t.sortDate],
        ['name', t.sortName],
      ]
      const menuFor = (kind, icon, label, options, current, choose) =>
        h(
          'div',
          { className: 'cw-menu-wrap' },
          h(
            'button',
            {
              type: 'button',
              className: 'cw-toolbtn',
              'aria-expanded': openMenu === kind ? 'true' : 'false',
              onClick: () => setOpenMenu(openMenu === kind ? '' : kind),
            },
            hIcon(icon, { width: 13, height: 13 }),
            h('span', null, label),
          ),
          openMenu === kind
            ? h(
                'div',
                { className: 'cw-pop', role: 'menu' },
                options.map(([value, text]) =>
                  h(
                    'button',
                    {
                      key: value,
                      type: 'button',
                      role: 'menuitem',
                      className: 'cw-pop-item' + (current === value ? ' cw-pop-on' : ''),
                      onClick: () => {
                        choose(value)
                        setOpenMenu('')
                      },
                    },
                    text,
                  ),
                ),
              )
            : null,
        )
      const filterBar = h(
        'div',
        { className: 'cw-filterbar' },
        menuFor('filter', FILTER_PATH, t.filter, filterOptions, filter, setFilter),
        menuFor('sort', SORT_PATH, t.sort, sortOptions, sort, setSort),
      )

      return h(
        'aside',
        {
          className: 'cw-panel' + (dock ? ' cw-dock' : ''),
          style: dock ? undefined : style,
          role: 'complementary',
          'aria-label': title,
        },
        h('div', { className: 'cw-panel-head' }, head),
        h(
          'div',
          { className: 'cw-topbar' },
          h(LangBox, { lang, t }),
          chips.length ? h('div', { className: 'cw-chip-row', style: { marginTop: '10px' } }, chips) : null,
          layer.type === 'bank' ? filterBar : null,
          layer.type === 'bank'
            ? h('input', {
                className: 'cw-search',
                type: 'search',
                value: query,
                placeholder: t.search,
                'aria-label': t.search,
                onChange: (event) => setQuery(event.target.value),
              })
            : null,
        ),
        h(
          'div',
          { className: 'cw-mainwrap' },
          h(
            'div',
            { className: 'cw-body' + (layer.type === 'bank' ? ' cw-body-flush' : '') },
            body,
            layer.type === 'term' ? h('div', { className: 'cw-foot' }, t.openHint) : null,
          ),
          // Outside the scroller on purpose: the rail must cover exactly the
          // visible height, so it neither scrolls away nor stretches with the list.
          layer.type === 'bank' ? h(AlphaRail, { onMiss: flashNotice }) : null,
          notice
            ? h('div', { className: 'cw-toast', role: 'status' }, t.noWordsFor.replace('{0}', notice))
            : null,
        ),
      )
    }

    function Tooltip({ tip, lang }) {
      const entry = ENTRY_BY_ID.get(tip.id)
      if (!entry) return null
      const t = dictFor(lang)
      // Mirrored horizontally: the card opens to the LEFT of the word, and only
      // flips back to the right when there is no room on that side.
      const width = 318
      const margin = 12
      const viewport = window.innerWidth || 1200
      const wordLeft = Math.max(margin, tip.left - tip.width / 2)
      const wordRight = Math.min(viewport - margin, tip.left + tip.width / 2)
      const openLeft = wordLeft - width - margin >= margin
      const x = openLeft ? wordLeft - margin : wordRight + margin
      const above = tip.top > 150
      const style = {
        left: x + 'px',
        top: (above ? tip.top - 8 : tip.bottom + 8) + 'px',
        transform: 'translate(' + (openLeft ? '-100%' : '0') + ', ' + (above ? '-100%' : '0') + ')',
      }
      return h(
        'div',
        { className: 'cw-tip', style },
        h(
          'div',
          { className: 'cw-tip-head' },
          h('span', { className: 'cw-tip-term' }, entry.term),
          h('span', { className: 'cw-chip cw-chip-brand' }, entry.kind === 'product' ? t.product : t.term),
        ),
        h('div', { className: 'cw-tip-short' }, pick(entry.short, lang)),
        entry.example ? h('div', { className: 'cw-tip-example' }, pick(entry.example, lang)) : null,
        h('div', { className: 'cw-tip-hint' }, t.clickHint),
      )
    }

    function SelectionMenu({ menu, lang }) {
      const t = dictFor(lang)
      const width = 176
      const height = 84
      const viewportW = window.innerWidth || 1200
      const viewportH = window.innerHeight || 800
      const left = Math.max(8, Math.min(menu.x, viewportW - width - 8))
      const top = Math.max(8, Math.min(menu.y, viewportH - height - 8))
      return h(
        'div',
        { className: 'cw-menu', style: { left: left + 'px', top: top + 'px' }, role: 'menu' },
        h(
          'button',
          {
            type: 'button',
            className: 'cw-menu-item',
            role: 'menuitem',
            onClick: async (event) => {
              event.preventDefault()
              event.stopPropagation()
              await copyText(menu.text)
              store.set({ menu: null })
            },
          },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '7px' } }, hIcon(COPY_PATH, { width: 13, height: 13 }), t.copy),
          h('span', { className: 'cw-menu-keys' }, 'Ctrl+C'),
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'cw-menu-item',
            role: 'menuitem',
            onClick: (event) => {
              event.preventDefault()
              event.stopPropagation()
              const context = selectionContext()
              const resolved = resolveSelection(menu.text)
              if (resolved) openTerm(resolved.id, sentenceAround(context, resolved.term), 'selection', true)
              else openRaw(menu.text, context, true)
            },
          },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '7px' } }, hIcon(QUESTION_PATH, { width: 13, height: 13 }), t.whatDis),
        ),
      )
    }

    function selectionContext() {
      const selection = window.getSelection()
      if (!selection || !selection.anchorNode) return menuText
      let el = selection.anchorNode
      if (el.nodeType !== 1) el = el.parentElement
      while (el && !BLOCK_TAGS[el.tagName]) el = el.parentElement
      if (!el) return menuText
      return sentenceAround(el.textContent, menuText)
    }

    function Overlay() {
      const [state, setState] = React.useState(store.get())
      React.useEffect(() => store.subscribe(() => setState(store.get())), [])
      const lang = state.lang
      // Once the native tab type is registered, the dock is the surface: a
      // floating copy would just stack a second pane over the column.
      const floating = !dockRegistered
      return h(
        'div',
        { className: 'cw-ui', 'data-cw-ui': '1' },
        floating && state.panel
          ? h(Panel, {
              key: state.panel.type === 'term' ? 'term:' + state.panel.id : 'raw:' + state.panel.text,
              layer: state.panel,
              width: 404,
              shift: 0,
              lang,
              onClose: closePanel,
            })
          : null,
        floating && state.bankOpen
          ? h(Panel, {
              key: 'bank',
              layer: { type: 'bank' },
              width: 364,
              shift: state.panel ? 416 : 0,
              lang,
              onClose: closeBank,
            })
          : null,
        state.tooltip ? h(Tooltip, { tip: state.tooltip, lang }) : null,
        state.menu ? h(SelectionMenu, { menu: state.menu, lang }) : null,
      )
    }

    function SessionProbe(props) {
      const id = props && props.sessionId
      React.useEffect(() => {
        setSessionId(id)
      }, [id])
      return null
    }

    function BankLauncher(props) {
      const wide = props && props.wide
      const [lang, setLangState] = React.useState(store.get().lang)
      React.useEffect(() => store.subscribe(() => setLangState(store.get().lang)), [])
      const t = dictFor(lang)
      return h(
        'button',
        { type: 'button', className: 'cw-launcher', title: t.bank, 'aria-label': t.bank, onClick: () => toggleBank() },
        hIcon(BOOK_PATH),
        wide ? h('span', null, t.bank) : null,
      )
    }

    /**
     * Body of the plugin's own tab in the native right sidebar. The column owns
     * its frame, width, resize handle, and close control; this only fills the
     * tab body with the current definition or the word bank.
     */
    function NativeDock() {
      const [state, setState] = React.useState(store.get())
      React.useEffect(() => store.subscribe(() => setState(store.get())), [])
      React.useEffect(() => {
        nativeMounted = true
        store.set({ dockTick: Date.now() })
        return () => {
          nativeMounted = false
          store.set({ dockTick: Date.now() })
        }
      }, [])
      const lang = state.lang
      const t = dictFor(lang)
      const [seed, setSeed] = React.useState('')
      let content
      if (state.bankOpen) {
        content = h(Panel, { key: 'bank', layer: { type: 'bank' }, lang, onClose: closeBank, dock: true, initialQuery: seed })
      } else if (state.panel) {
        content = h(Panel, {
          key: state.panel.type === 'term' ? 'term:' + state.panel.id : 'raw:' + state.panel.text,
          layer: state.panel,
          lang,
          onClose: closePanel,
          dock: true,
        })
      } else {
        content = h(DockEmpty, {
          lang,
          t,
          onOpenBank: () => toggleBank(),
          onSearch: (text) => {
            setSeed(text)
            toggleBank()
          },
        })
      }
      return h('div', { className: 'cw-dockwrap', 'data-cw-ui': '1' }, content)
    }

    function TabTitle() {
      const [state, setState] = React.useState(store.get())
      React.useEffect(() => store.subscribe(() => setState(store.get())), [])
      const t = dictFor(state.lang)
      return h('span', null, BRAND)
    }

    // ----------------------------------------------------------------- apply

    function safeService(ctx, key) {
      try {
        if (ctx && typeof ctx.get === 'function') return ctx.get(key) || null
        return ctx ? ctx[key] || null : null
      } catch (error) {
        return null
      }
    }

    function readSessionTitles(sessions) {
      if (!sessions) return
      try {
        const list = sessions.list
        const snapshot = list && typeof list.getSnapshot === 'function' ? list.getSnapshot() : null
        if (!snapshot || !snapshot.byId) return
        const titles = {}
        for (const id of Object.keys(snapshot.byId)) {
          const summary = snapshot.byId[id]
          const title = summary && (summary.title || summary.name)
          if (title) titles[id] = title
        }
        sessionTitles = titles
      } catch (error) {
        /* titles are decoration; ids still render */
      }
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        loadBank()
        services.sessions = safeService(ctx, 'sessions')
        services.uiWorkspace = safeService(ctx, 'uiWorkspace')

        const sessionList = services.sessions && services.sessions.list
        if (sessionList && typeof sessionList.subscribe === 'function') {
          ctx.effect(() => {
            const update = () => {
              readSessionTitles(services.sessions)
              store.set({ bankTick: Date.now() })
            }
            update()
            return sessionList.subscribe(update)
          })
        }

        ctx.effect(() => {
          const style = document.createElement('style')
          style.setAttribute('data-cw-style', '1')
          style.textContent = CSS
          document.head.appendChild(style)

          document.addEventListener('pointerover', onPointerOver, true)
          document.addEventListener('pointerout', onPointerOut, true)
          document.addEventListener('click', onHighlightClick, true)
          document.addEventListener('contextmenu', onContextMenu, true)
          document.addEventListener('pointerdown', onDocumentPointerDown, true)
          document.addEventListener('keydown', onKeyDown, true)
          document.addEventListener('mousedown', onMouseBack, true)
          document.addEventListener('mouseup', onMouseBack, true)
          document.addEventListener('auxclick', onMouseBack, true)
          document.addEventListener('selectionchange', onSelectionChange)
          window.addEventListener('scroll', onGlobalScroll, true)
          window.addEventListener('resize', onWindowResize, true)
          // Another window (or another tab) may rewrite the bank; reload rather
          // than overwriting it with this window's older copy.
          window.addEventListener('storage', onStorage)

          startObserver()

          return () => {
            if (debounceTimer) window.clearTimeout(debounceTimer)
            if (bank.timer) window.clearTimeout(bank.timer)
            clearTimers()
            looseMode = false
            if (observer) observer.disconnect()
            observer = null
            document.removeEventListener('pointerover', onPointerOver, true)
            document.removeEventListener('pointerout', onPointerOut, true)
            document.removeEventListener('click', onHighlightClick, true)
            document.removeEventListener('contextmenu', onContextMenu, true)
            document.removeEventListener('pointerdown', onDocumentPointerDown, true)
            document.removeEventListener('keydown', onKeyDown, true)
            document.removeEventListener('mousedown', onMouseBack, true)
            document.removeEventListener('mouseup', onMouseBack, true)
            document.removeEventListener('auxclick', onMouseBack, true)
            document.removeEventListener('selectionchange', onSelectionChange)
            window.removeEventListener('scroll', onGlobalScroll, true)
            window.removeEventListener('resize', onWindowResize, true)
            window.removeEventListener('storage', onStorage)
            if (style.parentNode) style.parentNode.removeChild(style)
            const stale = document.querySelectorAll('[data-cw]')
            for (const node of stale) {
              const parent = node.parentNode
              if (!parent) continue
              parent.replaceChild(document.createTextNode(node.textContent || ''), node)
              parent.normalize()
            }
            panelHistory.length = 0
            forwardHistory.length = 0
            store.set({ panel: null, bankOpen: false, tooltip: null, menu: null })
          }
        })

        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register({ name: 'shell.overlay', id: 'complex-words', order: 30 }, Overlay),
        )

        ctx.slots.inject('conversation.input.left', () =>
          ctx.slots.register({ name: 'conversation.input.left', id: 'complex-words-session', order: 90 }, SessionProbe),
        )

        ctx.slots.inject('sidebar.footer.action', () =>
          ctx.slots.register(
            { name: 'sidebar.footer.action', id: 'complex-words-bank', order: 40, label: () => 'Words bank' },
            BankLauncher,
          ),
        )

        // A tab of our own in the native right sidebar: the tab registry owns the
        // column, the frame, the chip and the close control, so the shipped Chat,
        // Files and Guide tabs stay exactly where they are.
        ctx.inject(['sidebarRightTabs', 'sidebarRight'], (injected) => {
          const tabs = injected.get('sidebarRightTabs')
          const right = injected.get('sidebarRight')
          if (!tabs || typeof tabs.register !== 'function') return
          services.sidebarRight = right || null

          const disposers = []
          try {
            disposers.push(
              tabs.register({
                id: TAB_ID,
                kind: TAB_ID,
                keepMounted: true,
                priority: 'extension',
                title: TAB_TITLE,
                guide: [{ id: TAB_ID, order: 60, title: TAB_TITLE }],
              }),
            )
          } catch (error) {
            return
          }
          disposers.push(
            ctx.slots.inject('sidebar.right.pane.tab', () =>
              ctx.slots.register({ name: 'sidebar.right.pane.tab', key: TAB_ID }, NativeDock),
            ),
          )
          disposers.push(
            ctx.slots.inject('sidebar.right.pane.tab.title', () =>
              ctx.slots.register({ name: 'sidebar.right.pane.tab.title', key: TAB_ID }, TabTitle),
            ),
          )
          dockRegistered = true
          store.set({ dockTick: Date.now() })
          return () => {
            for (const dispose of disposers.reverse()) {
              try {
                dispose()
              } catch (error) {
                /* one failed disposer must not strand the rest */
              }
            }
            dockRegistered = false
            services.sidebarRight = null
            store.set({ dockTick: Date.now() })
          }
        })
      },
    }
  },
})

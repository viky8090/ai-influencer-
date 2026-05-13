// ── Helpers ───────────────────────────────────────────────────
const R = arr => arr[Math.floor(Math.random() * arr.length)]

// ── Time / lighting configurations ───────────────────────────
const TIME_CONFIGS = [
  {
    label: 'golden hour late afternoon',
    lighting: 'late afternoon sun hitting from behind-right — warm golden light rimming the hair and the lit cheek, open sky filling the shadow side in cooler bluish tones. Both temperatures visible on the face at the same time. The kind of accidental perfect light you get outside around 5pm.',
  },
  {
    label: 'overcast soft daylight',
    lighting: 'solid overcast sky diffusing everything into even, directionless softness — no hard shadows anywhere, just gentle top-down modeling from the brightest patch of cloud. Cool and neutral throughout. Flat but honest.',
  },
  {
    label: 'bright sunny mid-morning',
    lighting: 'direct mid-morning sun from the front-left — hard, honest daylight with a clear nose shadow and a bright lit side. The shadow side filled by open blue sky. Exactly the kind of full-sun look an iPhone captures with auto exposure outdoors.',
  },
  {
    label: 'blue-hour dusk',
    lighting: 'sun already down — a warm sodium streetlamp from camera-left is the main light, directional and orange. The open sky fills the shadow side in deep cool blue. A nearby shopfront or neon sign catches the hair from behind. Three natural color sources on the face simultaneously, all because of where she is standing.',
  },
  {
    label: 'soft indoor afternoon window',
    lighting: 'afternoon daylight coming through a large window to camera-left — the near cheek lit and warm, falling off across the shadow side. Warm overhead room lighting fills the shadows gently. Window light and ambient room fill present at the same time. Natural, found, not arranged.',
  },
  {
    label: 'morning indoor café',
    lighting: 'window to the right letting in morning daylight as the main light source — warm overhead café bulbs secondary, faint cool screen or phone glow on the shadow side. Three natural light sources visible on the face because of where she\'s sitting, not because anything was set up.',
  },
]

function getTimesForNiche(niche) {
  const n = niche.toLowerCase()
  if (n.includes('fitness') || n.includes('sport') || n.includes('wellness'))
    return [TIME_CONFIGS[0], TIME_CONFIGS[0], TIME_CONFIGS[2]]
  if (n.includes('fashion') || n.includes('beauty'))
    return [TIME_CONFIGS[0], TIME_CONFIGS[1], TIME_CONFIGS[4]]
  if (n.includes('food') || n.includes('lifestyle'))
    return [TIME_CONFIGS[4], TIME_CONFIGS[5], TIME_CONFIGS[1]]
  if (n.includes('travel'))
    return [TIME_CONFIGS[0], TIME_CONFIGS[3], TIME_CONFIGS[1]]
  if (n.includes('tech') || n.includes('gaming') || n.includes('finance'))
    return [TIME_CONFIGS[4], TIME_CONFIGS[5], TIME_CONFIGS[2]]
  return TIME_CONFIGS
}

// ── Pose — driven by personality slider ──────────────────────
const POSES = {
  frontfacing: prop => `body facing directly toward camera, weight shifted onto one leg for a subtle hip tilt — relaxed, not stiff. ${prop ? `${prop} held naturally in front of the body, cradled loosely in both hands at mid-chest` : 'arms relaxed at the sides or one hand resting loosely near the hip, fingers natural'}. Eyes meeting the lens directly with a quiet, present expression — not forced, not a performance. The "comfortable in front of the camera" framing. Face fully visible and front-lit.`,
  contemplative: prop => `body facing 45° away from camera, weight forward on one leg. ${prop ? `${prop} held loosely at the side, almost forgotten` : 'hands relaxed loosely in front, fingers barely interlaced'}. Head turned back toward the lens mid-thought, eyes glancing toward but not fully meeting it — somewhere else mentally. A quiet, inward expression — not performing.`,
  plandid: prop => `body angled 25–30° to camera, weight settled on the back leg, hips slightly offset. ${prop ? `${prop} held naturally in one hand, wrist relaxed` : 'one hand mid-loose-gesture near the hip, the other hanging naturally'}. Eyes glancing down-and-off-axis, 15° away from lens. Expression caught mid-thought — a specific private moment. The "noticed the camera half a second ago" framing.`,
  posed_cute: prop => `body in soft 3/4 angle to camera, shoulders relaxed and slightly dropped. ${prop ? `${prop} held in both hands at chest height, elbows soft` : 'one hand gently touching the side of the jaw, fingers loose and natural'}. Eyes meeting the lens with a quiet small expression — a half-smile just forming, not fully committed. Posing but acting like she isn't.`,
  candid: prop => `mid-action — caught at the apex of ${prop ? `bringing the ${prop} toward the mouth, mid-sip, body naturally leaning slightly forward` : 'a genuine mid-laugh or bright spontaneous expression, body and shoulders caught in motion, one hand mid-gesture near the chest'}. Eyes looking directly toward the lens — spontaneous, unguarded eye contact full of real energy. Not posed, not looking away — the camera caught them in a real moment while they were already looking at it.`,
}

function getPoseFromPersonality(p) {
  if (p < 28) return POSES.contemplative
  if (p < 50) return POSES.plandid
  if (p < 70) return Math.random() > 0.5 ? POSES.plandid : POSES.posed_cute
  return Math.random() > 0.5 ? POSES.candid : POSES.posed_cute
}

// ── Wardrobe library ──────────────────────────────────────────
// Each entry: { text, gender, tags, energy (0–100), niches }
// energy: 0 = most understated/quiet, 100 = most bold/expressive
// Personality slider maps directly to energy range — this is what makes it "deeper than pose"
//
// Tag families:
//   quiet, minimalist, clean, structured, editorial
//   casual, urban, street, dark, moody
//   earthy, natural, bohemian, cottagecore
//   y2k, playful, nostalgic
//   glam, bold, evening
//   sport, functional, active
//   preppy, classic, polished

const WARDROBE = [
  // ── FEMALE ──────────────────────────────────────────────────
  // Quiet / understated (energy 0–20)
  { gender: 'female', energy: 5,  tags: ['quiet','minimalist','natural'],
    niches: ['fashion','lifestyle','travel','any'],
    text: 'Oversized natural linen shirt worn as a dress, belted loosely at the waist with a thin natural leather cord, hem falling mid-thigh; bare legs; flat leather mule in warm tan — no jewelry, no logos visible' },
  { gender: 'female', energy: 10, tags: ['quiet','minimalist','clean'],
    niches: ['fashion','beauty','lifestyle','any'],
    text: 'Washed ivory wide-leg linen trousers, slightly cropped at the ankle; fine-knit pale grey long-sleeve top tucked in; no accessories; clean white leather slide — no logos visible' },
  { gender: 'female', energy: 12, tags: ['quiet','minimalist','structured'],
    niches: ['fashion','tech','finance','lifestyle'],
    text: 'Soft camel oversized turtleneck, hem just untucked; dark wide-leg tailored trousers, clean break; worn-in dark chocolate leather loafer — no accessories, no logos visible' },
  { gender: 'female', energy: 18, tags: ['quiet','glam','minimalist'],
    niches: ['fashion','lifestyle','any'],
    text: 'Slip dress in heavy oyster satin, midi length, thin straps, no jewelry; flat leather thong sandal in bone — no logos visible' },

  // Understated with one intentional element (energy 20–40)
  { gender: 'female', energy: 22, tags: ['editorial','minimalist','structured'],
    niches: ['fashion','tech','finance'],
    text: 'Oversized dark navy blazer worn as a top, one button fastened, no shirt visible underneath; wide-leg pale grey trousers; clean pointed-toe leather flat — one thin gold chain, the only jewelry — no logos visible' },
  { gender: 'female', energy: 28, tags: ['clean','minimalist','casual'],
    niches: ['lifestyle','fashion','any'],
    text: 'Straight-leg dark indigo denim, clean hem; fitted ribbed white tank top tucked in; two thin layered delicate gold chains at the collarbone; clean white low-top leather sneakers — no logos visible' },
  { gender: 'female', energy: 30, tags: ['quiet','minimalist','casual'],
    niches: ['lifestyle','travel','fashion'],
    text: 'Worn soft-grey oversized cashmere crewneck sweater, slightly pilling at the cuffs; slim straight black denim; clean black leather loafer; small natural pebbled leather crossbody — no logos visible' },
  { gender: 'female', energy: 35, tags: ['minimalist','clean','travel'],
    niches: ['travel','lifestyle','fashion'],
    text: 'White linen shirt, collar open, sleeves slightly rolled once at the forearm; high-waist straight-leg ecru linen trousers, clean hem; tan leather strappy sandal, minimal ankle strap — no logos visible' },
  { gender: 'female', energy: 38, tags: ['preppy','classic','polished'],
    niches: ['fashion','lifestyle','tech'],
    text: 'Fitted dark hunter-green polo shirt, collar up slightly; high-waist straight-leg oat chino; white leather sneaker, clean; a single thin gold band ring — no logos visible' },

  // Balanced / versatile (energy 40–60)
  { gender: 'female', energy: 42, tags: ['casual','clean','urban'],
    niches: ['lifestyle','travel','any'],
    text: 'Oversized vintage-wash olive tee, neckline slightly relaxed, tucked loosely at the front; high-waist straight-leg light-wash denim; white low-top canvas shoe, faintly scuffed — no logos visible' },
  { gender: 'female', energy: 45, tags: ['minimalist','structured','clean'],
    niches: ['fashion','lifestyle','tech'],
    text: 'Fitted ribbed cream mock-neck top; tailored wide-leg charcoal trousers, clean hem; minimal white leather loafer; a thin gold bracelet — no logos visible' },
  { gender: 'female', energy: 48, tags: ['earthy','casual','natural'],
    niches: ['lifestyle','travel','any'],
    text: 'Well-worn straight-leg medium-wash denim; warm terracotta linen shirt tucked in, collar open; small simple gold hoop earrings; white sneaker, clean — no logos visible' },
  { gender: 'female', energy: 52, tags: ['casual','quiet','cottagecore'],
    niches: ['lifestyle','any'],
    text: 'Long open cardigan in soft oat-colored knit over a simple white fitted tee; straight-leg black jeans; white leather low sneaker; a thin woven cord bracelet — no logos visible' },
  { gender: 'female', energy: 55, tags: ['bohemian','earthy','natural'],
    niches: ['travel','lifestyle','wellness'],
    text: 'Lightweight washed cotton sundress in warm terracotta, thin straps, fabric draping softly at the waist; simple leather slide sandals, worn soft at the footbed; layered thin beaded bracelets — no logos visible' },
  { gender: 'female', energy: 58, tags: ['clean','casual','sport'],
    niches: ['fitness','lifestyle','any'],
    text: 'Oversized oat-colored cotton hoodie, slightly cropped, hood down; black bike shorts; white thick-sole trainer; small silver hoop earrings — no logos visible' },

  // Personality pieces emerging (energy 60–80)
  { gender: 'female', energy: 62, tags: ['editorial','urban','street'],
    niches: ['fashion','entertainment','lifestyle'],
    text: 'Oversized washed black structured blazer over a fitted white baby tee; straight-leg dark denim; chunky white platform sneaker; a single oversized signet ring — no logos visible' },
  { gender: 'female', energy: 65, tags: ['y2k','casual','playful'],
    niches: ['lifestyle','entertainment','fashion'],
    text: 'Y2K-adjacent low-rise straight-leg medium-wash denim; fitted pale blue ribbed halter top; a thin silver chain belt; clean white low-top sneaker — no logos visible' },
  { gender: 'female', energy: 68, tags: ['earthy','bohemian','warm'],
    niches: ['travel','lifestyle','fashion'],
    text: 'Rust orange wrap blouse in lightweight viscose, tied at the front, slightly billowing at the sleeves; high-waist wide-leg dark denim; leather wedge espadrille; two thin layered necklaces — no logos visible' },
  { gender: 'female', energy: 72, tags: ['dark','moody','street'],
    niches: ['entertainment','fashion','lifestyle'],
    text: 'Oversized faded black graphic tee, neckline slightly wide, tucked at the front into high-waist straight-leg black denim with subtle knee distress; chunky black platform boot, zip detail at ankle; a worn leather cuff — no logos visible' },
  { gender: 'female', energy: 75, tags: ['casual','street','y2k'],
    niches: ['lifestyle','entertainment','fashion'],
    text: 'Cropped raw-edge denim jacket worn open over a fitted white ribbed tank; high-waist flared dark denim; a simple thin leather belt; clean vintage white leather sneaker — no logos visible' },
  { gender: 'female', energy: 78, tags: ['editorial','structured','polished'],
    niches: ['fashion','finance','tech'],
    text: 'Sharply tailored double-breasted charcoal grey blazer with a strong shoulder, worn as the only top layer; matching wide-leg trouser; clean pointed-toe leather oxford; a single architectural earring in silver — no logos visible' },

  // Bold / expressive (energy 80–100)
  { gender: 'female', energy: 82, tags: ['glam','editorial','bold'],
    niches: ['fashion','entertainment'],
    text: 'Faux-fur trim coat in warm caramel, worn open; fitted black ribbed turtleneck underneath; straight black trousers; black pointed-toe ankle boot; statement oversized resin drop earrings — no logos visible' },
  { gender: 'female', energy: 88, tags: ['editorial','bold','structured'],
    niches: ['fashion'],
    text: 'Bold cobalt blue wide-leg trousers in structured crepe; matching blazer worn open over a barely-there black bralette; sculptural square-toe block heel; one architectural silver cuff — no logos visible' },
  { gender: 'female', energy: 92, tags: ['editorial','dark','glam'],
    niches: ['fashion','entertainment'],
    text: 'Sheer black organza blouse, buttons to the collar, translucent over a black bralette; wide-leg black tailored trousers; black strappy heeled sandal; a single large sculptural resin ring — no logos visible' },
  { gender: 'female', energy: 96, tags: ['bold','colorful','playful'],
    niches: ['fashion','entertainment'],
    text: 'Acid-yellow cropped structured blazer worn open, no top underneath; wide-leg cream tailored trouser; pointed-toe yellow leather kitten heel; a stack of thin gold rings — no logos visible' },

  // Dressy / glam at medium energy — for "fancy dress / events" personas
  { gender: 'female', energy: 48, tags: ['glam', 'evening', 'polished'],
    niches: ['fashion', 'lifestyle', 'entertainment', 'any'],
    text: 'Satin slip midi dress in warm ivory, thin adjustable straps, fabric draping softly at the hip with a subtle liquid sheen; dainty thin-strap gold sandal; two delicate layered chains at the collarbone — no logos visible' },
  { gender: 'female', energy: 56, tags: ['glam', 'editorial', 'structured'],
    niches: ['fashion', 'entertainment', 'lifestyle'],
    text: 'Tailored blazer dress in deep forest green, single-button, hitting mid-thigh with slight shoulder structure; sheer natural-toned tights; pointed-toe kitten heel in black; a simple gold bracelet — no logos visible' },
  { gender: 'female', energy: 62, tags: ['glam', 'evening', 'polished'],
    niches: ['fashion', 'entertainment', 'any'],
    text: 'Fitted ribbed knit midi dress in warm caramel with a modest scoop neckline; strappy heeled sandal in bone; thin layered gold chains and small sculptural gold hoops — no logos visible' },
  { gender: 'female', energy: 70, tags: ['glam', 'bold', 'evening'],
    niches: ['fashion', 'entertainment'],
    text: 'Silky wrap midi dress in deep burgundy, thin tie at the waist, the fabric catching light as she moves; pointed-toe strappy heeled sandal in cognac; gold drop earrings and a single thin chain — no logos visible' },

  // Fitness/sport (separate energy track)
  { gender: 'female', energy: 30, tags: ['sport','functional','clean'],
    niches: ['fitness','wellness'],
    text: 'Seamless sage green sports bra with subtle vertical ribbing; matching high-waist compression leggings, slight sheen at the hip; clean white training shoe — no logos visible' },
  { gender: 'female', energy: 40, tags: ['sport','earthy','natural'],
    niches: ['fitness','wellness'],
    text: 'Sage green seamless sports bra with subtle cross-back detail; matching high-waist compression leggings; warm beige trail-running shoe — no logos visible' },
  { gender: 'female', energy: 50, tags: ['sport','clean','pastel'],
    niches: ['fitness','wellness'],
    text: 'Lavender matching set: ribbed high-neck sports bra and high-waist leggings; clean white low-profile trainer; small pearl stud earrings — no logos visible' },
  { gender: 'female', energy: 65, tags: ['sport','earthy','warm'],
    niches: ['fitness','wellness'],
    text: 'Warm rust-toned sports bra with wide straps; matching full-length high-waist leggings in amber; clean gum-sole running shoe — a thin gold chain necklace — no logos visible' },

  // ── MALE ────────────────────────────────────────────────────
  // Quiet / understated (energy 0–20)
  { gender: 'male', energy: 8,  tags: ['quiet','minimalist','natural'],
    niches: ['fashion','lifestyle','travel','any'],
    text: 'Washed natural linen overshirt, all buttons done, sleeves folded; loose straight-leg light sand trousers; leather Birkenstock-style sandal; no accessories — no logos visible' },
  { gender: 'male', energy: 15, tags: ['quiet','minimalist','clean'],
    niches: ['fashion','tech','finance','lifestyle'],
    text: 'Soft white cotton crewneck sweater, slightly oversize; straight-leg charcoal wool-blend trousers, clean break at the ankle; clean white leather low sneaker — no logos visible' },
  { gender: 'male', energy: 18, tags: ['quiet','structured','minimalist'],
    niches: ['tech','finance','fashion'],
    text: 'Fine-knit charcoal grey turtleneck; tailored straight-leg dark navy trousers; clean black leather oxford; no accessories — no logos visible' },

  // Understated with one intentional element (energy 20–40)
  { gender: 'male', energy: 25, tags: ['minimalist','earthy','casual'],
    niches: ['lifestyle','travel','fashion'],
    text: 'Unstructured dark olive linen jacket worn open; white fitted tee underneath; slim straight light-wash denim; white leather loafer — no logos visible' },
  { gender: 'male', energy: 30, tags: ['minimalist','quiet','preppy'],
    niches: ['tech','finance','lifestyle'],
    text: 'Soft grey quarter-zip merino sweater; slim straight dark navy chino; clean white low-profile sneaker; a simple stainless steel watch — no logos visible' },
  { gender: 'male', energy: 35, tags: ['casual','clean','natural'],
    niches: ['lifestyle','travel','any'],
    text: 'Cream relaxed-fit linen button-down, collar open, tucked at front only; straight-leg medium-wash denim; clean suede chukka in warm tan — no logos visible' },
  { gender: 'male', energy: 38, tags: ['preppy','classic','clean'],
    niches: ['lifestyle','fashion','tech'],
    text: 'Relaxed Oxford shirt in washed pale blue, collar open one button; slim straight-leg oat chino; clean white leather low sneaker — a single thin woven bracelet — no logos visible' },

  // Balanced (energy 40–60)
  { gender: 'male', energy: 42, tags: ['casual','clean','urban'],
    niches: ['any'],
    text: 'Clean white heavyweight cotton tee, crew neck slightly relaxed from washing; well-worn straight-leg dark denim; clean low-profile white trainer — no logos visible' },
  { gender: 'male', energy: 45, tags: ['casual','dark','urban'],
    niches: ['lifestyle','fashion','entertainment'],
    text: 'Washed black overshirt worn open over a fitted white tee; slim straight dark grey jeans; clean dark leather low sneaker — no logos visible' },
  { gender: 'male', energy: 50, tags: ['earthy','casual','natural'],
    niches: ['lifestyle','travel'],
    text: 'Soft moss-green relaxed-fit shirt, collar open two buttons, sleeves rolled; straight-leg tan chino; leather loafer in natural tan — no logos visible' },
  { gender: 'male', energy: 55, tags: ['minimalist','casual','clean'],
    niches: ['lifestyle','any'],
    text: 'Ivory relaxed-fit linen shirt, collar open, slightly untucked; straight-leg washed black denim; clean white canvas slip-on; no accessories — no logos visible' },

  // Personality pieces (energy 60–80)
  { gender: 'male', energy: 62, tags: ['street','urban','casual'],
    niches: ['fashion','entertainment','lifestyle'],
    text: 'Washed charcoal oversized heavyweight jersey crewneck, dropped shoulder seam; straight-leg dark indigo denim, clean hem; clean white low-profile leather sneakers, toe box faintly creased — no logos visible' },
  { gender: 'male', energy: 68, tags: ['urban','casual','dark'],
    niches: ['lifestyle','travel','entertainment'],
    text: 'Dark green waxed canvas overshirt, collar slightly popped; fitted white tee underneath; slim straight black denim; clean black leather low sneaker; a worn thin leather cord necklace — no logos visible' },
  { gender: 'male', energy: 72, tags: ['street','y2k','urban'],
    niches: ['fashion','entertainment'],
    text: 'Wide-leg black carpenter denim with subtle hardware at the thigh pocket; oversized washed white tee, hem asymmetric; clean chunky white trainer; a thin chain around the neck — no logos visible' },
  { gender: 'male', energy: 75, tags: ['street','casual','warm'],
    niches: ['lifestyle','entertainment'],
    text: 'Oversized washed terracotta crewneck hoodie, drawstrings slightly uneven; wide-leg dark grey sweatpant, tapered at the ankle; clean white low-top canvas shoe; a small hoop earring — no logos visible' },
  { gender: 'male', energy: 78, tags: ['editorial','structured','dark'],
    niches: ['fashion','entertainment'],
    text: 'Long black overcoat, collar turned up; fitted black turtleneck; slim straight black trouser; clean black leather chelsea boot; no other accessories — no logos visible' },

  // Bold / expressive (energy 80–100)
  { gender: 'male', energy: 85, tags: ['editorial','bold','glam'],
    niches: ['fashion','entertainment'],
    text: 'Wide-leg houndstooth suit trouser; matching blazer worn open, no shirt, a thin chain at the collarbone; clean pointed-toe leather oxford in cognac — no logos visible' },
  { gender: 'male', energy: 92, tags: ['editorial','bold','colorful'],
    niches: ['fashion','entertainment'],
    text: 'Bold cobalt blue wide-leg cord trousers; fitted black ribbed turtleneck; clean white leather boot; a stack of thin silver rings — no logos visible' },

  // Male fitness
  { gender: 'male', energy: 30, tags: ['sport','functional','clean'],
    niches: ['fitness'],
    text: 'Fitted dark navy performance tee, slightly damp at the collar; black tapered training shorts with small side-slit; clean white training shoe, toe box faintly scuffed — no logos visible' },
  { gender: 'male', energy: 50, tags: ['sport','casual','street'],
    niches: ['fitness','lifestyle'],
    text: 'Oversized washed grey hoodie, hem hitting mid-thigh; black fitted training short; clean minimalist training shoe in white — no logos visible' },
  { gender: 'male', energy: 40, tags: ['sport','clean','functional'],
    niches: ['fitness'],
    text: 'White tech-fabric sleeveless training vest, slight drape; black compression training shorts; clean white trainer — no logos visible' },

  // ── OLD MONEY / QUIET LUXURY ─────────────────────────────────
  { gender: 'male', energy: 15, tags: ['old-money','classic','quiet','polished'],
    niches: ['lifestyle','fashion','travel','any'],
    text: 'Unstructured camel linen blazer, lapels slightly soft from wear, over a white Oxford shirt with three buttons casually open; slim straight-leg cream chino with a faint crease; tan penny loafer in full-grain leather, slightly worn at the heel; a chunky gold signet ring on the left pinky; a simple leather-strap watch on the wrist — no logos visible' },
  { gender: 'male', energy: 18, tags: ['old-money','natural','casual'],
    niches: ['lifestyle','travel','any'],
    text: 'Fine-knit off-white cotton polo, very relaxed fit, lightly sun-faded; well-worn straight-leg pale blue denim with a clean hem; white leather tennis sneaker, slightly soft at the toe; a gold signet ring on the left pinky; a steel watch on a leather strap — no logos visible' },
  { gender: 'male', energy: 22, tags: ['old-money','preppy','polished'],
    niches: ['lifestyle','fashion'],
    text: 'Navy linen blazer worn open over a faded white linen shirt, collar three buttons open, sleeves pushed; straight-leg sand chino; cognac leather loafer, worn smooth at the sole edge; a thin gold watch with a worn brown leather strap — no logos visible' },
  { gender: 'male', energy: 28, tags: ['old-money','casual','quiet'],
    niches: ['lifestyle','travel'],
    text: 'Soft washed Oxford shirt in faded pale blue, oversized and fully untucked, buttons open to mid-chest; well-worn straight-leg light sand chino; faded canvas boat shoe in tan; a gold signet ring; a simple leather-strap watch — no logos visible' },
  { gender: 'male', energy: 20, tags: ['old-money','structured','quiet'],
    niches: ['fashion','lifestyle'],
    text: 'Tailored cream linen trousers with a clean crease; a white linen shirt collar open, untucked; tan leather loafer with a light scuff at the toe; a thin gold chain at the collarbone; a slim leather-strap watch — no logos visible' },
  { gender: 'male', energy: 35, tags: ['old-money','classic','relaxed'],
    niches: ['lifestyle','any'],
    text: 'Soft camel cable-knit crewneck sweater, slightly oversize, hem relaxed over the waistband; slim straight-leg dark navy chino; clean white leather low sneaker; a gold signet ring; no other jewelry — no logos visible' },

  { gender: 'female', energy: 12, tags: ['old-money','classic','quiet','polished'],
    niches: ['lifestyle','fashion','any'],
    text: 'Perfectly tailored cream wide-leg linen trousers; a fine-knit white short-sleeve polo, tucked neatly; a single strand of small pearls at the collarbone; tan leather loafer, buffed; a simple gold bracelet — no logos visible' },
  { gender: 'female', energy: 18, tags: ['old-money','natural','casual'],
    niches: ['lifestyle','travel','fashion'],
    text: 'Oversize washed Oxford shirt in pale chambray, three buttons open, half-tucked into straight-leg ecru linen trousers; gold signet ring; worn-in tan leather sandal with a minimal strap — no logos visible' },
  { gender: 'female', energy: 22, tags: ['old-money','preppy','polished'],
    niches: ['lifestyle','fashion'],
    text: 'Slim-fit navy blazer, single button, worn over a white striped poplin shirt, collar open; straight-leg cream chino, clean hem; flat leather loafer in tan; a thin gold chain and small pearl stud earrings — no logos visible' },
  { gender: 'female', energy: 28, tags: ['old-money','classic','quiet'],
    niches: ['lifestyle','any'],
    text: 'Soft camel cashmere crewneck sweater, slightly oversize; straight-leg oat linen trousers; clean white leather sneaker; a thin gold chain; a small leather tote held at the crook of the arm — no logos visible' },
]

// Vibe words → tag arrays (not 1:1 → single outfit — they filter the library)
const VIBE_TAG_MAP = {
  'Minimalist':    ['minimalist', 'quiet', 'clean'],
  'Editorial':     ['editorial', 'structured', 'bold'],
  'Streetwear':    ['street', 'urban', 'casual'],
  'Bohemian':      ['bohemian', 'earthy', 'natural'],
  'Glam':          ['glam', 'evening', 'bold'],
  'Sporty':        ['sport', 'functional', 'active'],
  'Y2K':           ['y2k', 'playful', 'nostalgic'],
  'Dark & Moody':  ['dark', 'moody', 'urban'],
  'Clean Girl':    ['clean', 'minimalist', 'natural'],
  'Cottagecore':   ['cottagecore', 'natural', 'earthy'],
  'Tech Bro':      ['minimalist', 'structured', 'clean'],
  'Preppy':        ['preppy', 'classic', 'polished'],
  'Old Money':     ['old-money', 'classic', 'polished', 'quiet'],
}

function getVibeTags(vibeWords) {
  return (vibeWords || []).flatMap(v => VIBE_TAG_MAP[v] || [])
}

// Bio keyword → wardrobe tag boost (backstory / physical desc inform styling cues)
function getStyleCuesFromBio(physicalDesc, backstory) {
  const text = ((physicalDesc || '') + ' ' + (backstory || '')).toLowerCase()
  const tags = []
  if (/old.?money|heritage|generational|ivy.?league|yacht|polo|equestrian|boarding.?school|inherited|country.?club|newport|nantucket|vineyard|prep.?school/.test(text))
    tags.push('old-money', 'classic', 'polished', 'quiet')
  if (/designer|luxury|couture|high.?end|bespoke|tailored.?wardrobe|curated|high.?fashion|fashion.?week|rick owens|zegna|loro piana|brioni|kiton|loewe|the row|bottega|celine/.test(text))
    tags.push('polished', 'editorial', 'structured', 'old-money')
  if (/street|urban|downtown|brooklyn|skate|graffiti/.test(text))
    tags.push('street', 'urban', 'casual')
  if (/\bminimalist\b|\bminimal\b|understated|quiet.?aesthetic/.test(text))
    tags.push('minimalist', 'quiet', 'clean')
  if (/boho|bohemian|free.?spirit|wanderer|earthy/.test(text))
    tags.push('bohemian', 'earthy', 'natural')
  if (/dark.?aesthetic|gothic|moody|alternative|grunge/.test(text))
    tags.push('dark', 'moody', 'urban')
  if (/glam|glamour|glitter|sequin|evening.?wear|gala|fancy|formal|black.?tie|cocktail|ball|gown|dressed.?up|dress.?up|party|events|heels/.test(text))
    tags.push('glam', 'evening', 'bold')
  return tags
}

// Personality energy → wardrobe energy window
// Introvert = quieter clothes, extrovert = bolder clothes
// Window has overlap so selection isn't too rigid
function getEnergyWindow(personality) {
  const center = personality // 0–100 maps directly
  const half = 28            // ±28 tolerance around the center
  return { min: Math.max(0, center - half), max: Math.min(100, center + half) }
}

// Personality styling note — appended to wardrobe to describe HOW it's worn
function getStylingNote(personality) {
  if (personality < 25) return 'Worn without deliberateness — clothes exist, not styled.'
  if (personality < 45) return 'Put together but not overthought — one considered choice, the rest just fits.'
  if (personality < 60) return 'Casually considered — looks good without looking like effort.'
  if (personality < 78) return 'Visibly intentional — pulling the look together on purpose, naturally.'
  return 'Fully committed — every piece deliberate, confident in the choices.'
}

// Score and select wardrobe from the library
function selectWardrobe(gender, vibeWords, personality, niche, physicalDesc, backstory) {
  const isMale = gender?.toLowerCase() === 'male'
  const vibeTags = [...getVibeTags(vibeWords), ...getStyleCuesFromBio(physicalDesc, backstory)]
  const { min, max } = getEnergyWindow(personality)
  const nicheL = niche.toLowerCase()

  // Filter by gender
  const genderPool = WARDROBE.filter(e =>
    isMale ? e.gender === 'male' : e.gender === 'female'
  )

  // Score each entry
  const scored = genderPool.map(e => {
    let score = 0

    // Energy proximity — entries closer to personality center score higher
    const energyDist = Math.abs(e.energy - personality)
    if (energyDist <= 15) score += 40        // very close match
    else if (energyDist <= 28) score += 20   // within tolerance
    else score -= 20                          // outside window — penalize but don't fully exclude

    // Niche affinity
    const nicheMatch = e.niches.includes('any') || e.niches.some(n => nicheL.includes(n))
    if (nicheMatch) score += 25

    // Vibe tag overlap — each matching tag scores
    if (vibeTags.length > 0) {
      const tagMatches = e.tags.filter(t => vibeTags.includes(t)).length
      score += tagMatches * 18
    }

    // Controlled randomness — keeps variety across generations
    score += Math.random() * 14

    return { ...e, score }
  })

  scored.sort((a, b) => b.score - a.score)

  // Pick randomly from top candidates so it's never deterministic
  const topN = Math.min(6, scored.length)
  const chosen = scored.slice(0, topN)
  const entry = R(chosen)

  return `${entry.text}. ${getStylingNote(personality)}`
}

// ── Scene pools by niche ──────────────────────────────────────
const SCENE_POOLS = {
  fashion: [
    'sun-drenched SoHo loft, whitewashed exposed brick, tall factory windows, morning light pooling on oak floors',
    'Paris Le Marais narrow side street, charcoal limestone facades, cobblestones faintly damp, warm afternoon shade with a bright lane-end opening behind',
    'minimal Copenhagen café interior, raw concrete wall, warm oak counter surface catching window light',
    'Tokyo backstreet alley, clean concrete with layers of soft-focus weathered signage, warm evening ambient',
    'Milanese internal courtyard, faded terracotta plaster walls, afternoon sun cutting a diagonal stripe across the floor',
  ],
  beauty: [
    'sun-flooded modern bathroom, small window at 9 o\'clock, white subway tiles, faint steam in the air, morning',
    'clean neutral hotel room, floor-to-ceiling window, soft afternoon city skyline behind',
    'bedroom with large east-facing window, morning light angled low, white walls',
    'minimalist vanity corner, large mirror catching daylight from a nearby window',
  ],
  fitness: [
    'minimalist gym, natural oak floors, white walls, high windows with golden side-light from camera-left',
    'outdoor park trail, city skyline softened beyond treeline, morning ground mist',
    'concrete rooftop workout space, city spread below, blue-hour transition light',
    'empty beach at low tide, wet packed sand, low warm morning light catching the surface',
    'urban outdoor running path, tree canopy overhead, soft dappled morning light through leaves',
  ],
  travel: [
    'terracotta European alleyway, afternoon shade, warm stone walls both sides, bright sunlit opening far behind',
    'elevated viewpoint, city in golden hour atmospheric haze below',
    'harbor wall of a small coastal town, boats soft in background, overcast morning',
    'narrow Kyoto side street, wooden facades, soft diffused late-afternoon light',
    'rooftop above Mediterranean rooflines, warm evening, terracotta and white receding behind',
  ],
  lifestyle: [
    'warm neighborhood café corner, marble counter, condensation on the window, mid-afternoon light',
    'sun-bleached urban rooftop terrace, city rooflines behind, golden hour',
    'city pavement under a canopy of plane trees, mottled shade-and-sun, late morning',
    'hotel room window ledge, soft city panorama through glass, afternoon',
    'sun-filled apartment kitchen, white tiles, indoor plants catching window light, morning',
  ],
  tech: [
    'minimal open-plan office, floor-to-ceiling window, cool diffused cloud daylight, industrial ceiling soft behind',
    'coffee shop corner, laptop implied just off-frame, morning window light from 9 o\'clock',
    'clean home studio setup, soft north-facing window, minimal desk behind',
    'modern co-working space, city view through full-height glass, afternoon',
  ],
  gaming: [
    'clean battlestation visible behind, RGB soft-glow as background, one window at 90° as key light',
    'modern space, neon accent soft in background, late evening one-window key',
  ],
  entertainment: [
    'rooftop at golden hour, city below, warm haze',
    'urban mural wall, bold color out of focus, late afternoon',
    'backstage corridor, warm strip practicals above, evening',
  ],
  default: [
    'clean urban street corner, warm afternoon, city architecture as soft atmospheric background',
    'bright minimal interior, natural daylight from large windows, white walls receding',
    'rooftop with city skyline behind, golden hour haze, warm atmospheric depth',
    'café window seat, street softened behind glass, afternoon light from the left',
  ],
}

// Outdoor-only scenes for the candid variation — always outside, alive, real
const OUTDOOR_CANDID_SCENES = [
  'tree-lined city sidewalk, mid-morning, soft dappled light filtering through the canopy overhead',
  'outdoor café terrace, small round table nearby, city street softened behind, mid-afternoon sun',
  'sunny boutique shopping street, warm afternoon light on the storefronts, no other people',
  'urban park path, greenery on both sides, natural soft mid-morning light through the trees',
  'corner outside a coffee shop, city intersection behind, warm mid-morning light from the side',
  'sun-warmed city steps or a low ledge at the edge of an open plaza, afternoon light from the front',
  'wide sun-drenched pavement outside a row of boutiques, warm late afternoon',
  'rooftop terrace with a few potted plants, city rooflines visible behind, golden hour light',
  'narrow sunny side street, warm afternoon light cutting diagonally across the pavement',
  'small outdoor market square, light warm and directional, the square otherwise empty',
]

function getScenePool(niche) {
  const n = niche.toLowerCase()
  if (n.includes('fashion')) return SCENE_POOLS.fashion
  if (n.includes('beauty')) return SCENE_POOLS.beauty
  if (n.includes('fitness') || n.includes('wellness') || n.includes('sport')) return SCENE_POOLS.fitness
  if (n.includes('travel')) return SCENE_POOLS.travel
  if (n.includes('gaming')) return SCENE_POOLS.gaming
  if (n.includes('entertainment')) return SCENE_POOLS.entertainment
  if (n.includes('tech') || n.includes('finance')) return SCENE_POOLS.tech
  if (n.includes('lifestyle') || n.includes('food')) return SCENE_POOLS.lifestyle
  return SCENE_POOLS.default
}

// ── Prop — niche-appropriate, ~50% chance ────────────────────
function getProp(niche) {
  if (Math.random() > 0.55) return null
  const n = niche.toLowerCase()
  if (n.includes('fitness') || n.includes('sport') || n.includes('wellness'))
    return R([
      'stainless steel wide-mouth water bottle, no logo, condensation on the outside',
      'small wired earbuds just removed, held loosely in one hand',
      'green smoothie in a clear cup with a paper straw',
      null,
    ])
  if (n.includes('food') || n.includes('lifestyle') || n.includes('fashion') || n.includes('beauty'))
    return R([
      'iced matcha latte in a clear to-go cup, bright green, paper straw, slight condensation on the outside',
      'bubble milk tea in a clear sealed cup, fat straw, slightly condensated',
      'iced coffee in a clear coffee shop cup with a dome lid, paper straw',
      'small paper shopping bag held loosely at the side by the handles',
      'matcha in a small ceramic takeaway cup, no lid',
      'croissant in a small paper bag, partially eaten',
      'iced latte in a clear cup, light brown, ice visible through the sides, paper straw',
      null,
    ])
  if (n.includes('travel'))
    return R([
      'iced coffee in a clear to-go cup, paper straw',
      'small travel thermos, no logo',
      'worn-in paperback held loosely by the spine',
      'small paper bag from a local shop, handles in hand',
      null,
    ])
  if (n.includes('tech') || n.includes('gaming') || n.includes('finance'))
    return R(['phone held loosely at the side, screen off', 'coffee in a small paper cup', null])
  return R([
    'iced matcha latte in a clear to-go cup, paper straw',
    'iced coffee in a clear cup, paper straw',
    'small coffee in a ceramic cup',
    null,
  ])
}

// ── Camera selection by niche + personality ───────────────────
// Always iPhone 16 Pro — the entire app identity is iPhone realism, never a professional camera
function getCamera(niche, personality) {
  const n = niche.toLowerCase()
  if (n.includes('fitness') || n.includes('sport'))
    return 'iPhone 16 Pro 24mm main lens f/1.78, held at arm\'s length or by a nearby friend, slight upward angle, automatic exposure, natural sensor noise in shadow areas, 9:16 vertical, three-quarter to chest-up framing, subject fills the center of the frame'
  if (n.includes('travel'))
    return 'iPhone 16 Pro 24mm main lens f/1.78, held at arm\'s length or by a friend standing close, automatic settings, natural lens distortion at corners, sensor noise in shadows, 9:16 vertical, three-quarter or chest-up framing, subject fills the majority of the frame'
  return 'iPhone 16 Pro 24mm main lens f/1.78, held at arm\'s length or by a nearby friend, automatic exposure, natural sensor noise in shadow areas, slight lens barrel distortion at edges, 9:16 vertical, chest-up framing, face at the upper-third line, subject fills the center of the frame'
}

// ── Skin realism block ────────────────────────────────────────
function buildSkinBlock(timeLabel, gender, physicalDesc) {
  const pronoun = gender?.toLowerCase() === 'male' ? 'his' : 'her'
  const p = (physicalDesc || '').toLowerCase()
  const hasFair = p.includes('fair') || p.includes('pale') || p.includes('light skin')
  const hasDark = p.includes('dark skin') || p.includes('deep') || p.includes('ebony') || p.includes('melanin')

  const envReactions = {
    'golden hour late afternoon': hasFair
      ? 'warm golden flush across the forehead and cheekbone tops — more visible on fair skin, the lit side noticeably warm'
      : hasDark
      ? 'rich deep skin tones dimensional in the golden light, the high points — forehead, cheekbone — catching warmth'
      : 'faint sun-warmth across the forehead and tops of the cheekbones from afternoon outdoor exposure',
    'overcast soft daylight': 'even, cool-environment skin with a natural healthy flush — no sun warmth, no windburn',
    'bright sunny mid-morning': 'slight sun-warmth flush on the forehead and nose bridge, micro-fine sweat at the temples catching the hard light',
    'blue-hour dusk': 'faint cold-air redness around the nostrils and upper cheeks from the cooling evening temperature',
    'soft indoor afternoon window': 'soft thermal indoor flush at the cheeks from the heated space, gentle warmth settling across the face',
    'morning indoor café': 'a light warmth-flush as the skin adjusts from outdoor cool to the heated interior, slight color at the cheeks',
  }

  return `— Visible individual pores across ${pronoun} T-zone, nose, and cheeks; pores on the lit side cast tiny directional micro-shadows from the key light
— ${envReactions[timeLabel] || envReactions['overcast soft daylight']}
— ${R(['a small healing blemish on the left jaw, slightly pinker than surrounding skin', 'faint asymmetric sun pigmentation near the right temple', 'two freckles placed asymmetrically across the nose and left cheek', 'a faint old thin scar below the right jawline — barely there, photographically real', 'slight horizontal pressure line across the forehead from a hat worn earlier'])}
— Left brow sits marginally higher than the right; one nostril slightly narrower; cupid\'s bow peaks uneven — natural asymmetry throughout
— Subtle digital sensor noise in the shadow areas consistent with iPhone auto-ISO`
}

// ── Character framing from personality + backstory ────────────
function getCharacterFraming(personality, backstory) {
  const energy = personality < 30
    ? 'quiet, inward energy — someone with a rich internal world, not performing for the camera'
    : personality > 70
    ? 'open, present energy — moves through the world with ease, comfortable being seen'
    : 'natural, unhurried energy — comfortable in the moment'

  if (backstory?.trim()) {
    const brief = backstory.trim().split(/[.!?]/)[0].trim().toLowerCase()
    if (brief.length > 10 && brief.length < 120)
      return `${energy}. The feeling of ${brief} — real person, real life, not a model on a shoot`
  }
  return `${energy} — the face of someone living their life, not a model on a shoot`
}

// ── Claude system prompt ──────────────────────────────────────
export const HIGGSFIELD_SYSTEM = `You are a specialized prompt engineer for AI Influencer Studio — an app that generates iPhone-realism influencer photos. Every image must look exactly like a real photo taken on an iPhone by a friend: handheld, natural found light, real location, zero professional photography setup, zero retouching. This is the core identity of the product.

You write prompts only — never generate images. Convert the influencer profile below into a single GPT Image 2 prompt using EXACTLY this section format, with a blank line between each section:

Scene: [named real-world location — specific country feel, time of day, weather, atmosphere. State: "The location is empty of other people. Background reads as recognizable context but recedes — subject is the focal point."]

Subject: [age, gender, ethnicity/heritage cues from physical description, build, hair with color/length/texture, face shape, eye shape and color, distinguishing marks. Frame the character using their personality and backstory — the energy they carry. Include at least one anti-attractiveness-attractor cue: "end-of-day energy," "real person, not a model on a shoot," "lived-in."]

Pose: [body angle in degrees, weight distribution, specific hand placement. Drive pose style from personality score — low = contemplative/plandid/off-axis; high = candid mid-action or soft-aware posed-cute. Expression as a specific moment, not a label.]

Wardrobe & details: [every garment with material, fit, color, condition — specific, not generic. CRITICAL: personality score drives the energy level of the wardrobe — low personality = quiet understated clothes worn without deliberateness; high personality = expressive pieces worn with full intention. Use vibe words to steer aesthetic direction within that energy level. Include a note on HOW the clothes are worn (deliberately styled vs. just put on). No visible brand logos on any item.]

Lighting: [primary source with Kelvin and clock direction; secondary; ambient. 2–3 color temperatures on the face if mixed. "The subject's face is the brightest element in the frame."]

Camera & capture: [always iPhone 16 Pro 24mm main lens f/1.78, handheld, automatic settings, natural sensor noise in shadows. 9:16. Framing. Never a professional camera.]

Skin (rendered as concrete photographic facts — never adjectives):
— Visible pores with location and micro-shadow direction from the key light
— Specific environmental skin reaction — adapt to skin tone if described in the physical description
— One pressure/contact-line detail
— Lip condition
— One honest imperfection with exact placement
— One micro-detail real photos always have
— Satin sheen at high points only — rest matte and lived-in
— Peach fuzz catching key light along jawline and upper lip
— Asymmetry call
— Sensor noise matching camera and light level

Use case: [candid plandid / cute-posed feed shot / contemplative editorial / mid-action lifestyle]

Constraints: no people anywhere in the background. No visible brand logos. The subject is the clear focal point. iPhone photo — no blur, no bokeh, no professional lighting setup, no beauty retouching. Real pore texture and skin imperfections must be visible. This image must be indistinguishable from a real photo a friend posted on Instagram.

Rules:
- Every image is an iPhone snapshot — natural found light, handheld, real moment, zero professional photography feel
- Personality score drives wardrobe energy AND pose energy — they must feel consistent
- Vibe words steer aesthetic direction, not a single locked outfit — vary freely within that aesthetic direction
- Physical description feeds the Subject section exactly and informs the skin block's environmental reaction
- Backstory informs the character's energy framing in Subject
- Never: stunning, ethereal, hyper-realistic, 8K, ultra-detailed, perfect, glowing, symmetrical, flawless, editorial, fashion shoot
- Positive skin framing only — describe what real skin looks like
- Output ONLY the prompt inside one code block — no explanation, no preamble`

// ── Brief for Claude ──────────────────────────────────────────
export function buildPromptInput(d) {
  const nicheArr = Array.isArray(d.niches) && d.niches.length ? d.niches : d.niche ? [d.niche] : []
  const niche = [...nicheArr.filter(n => n !== 'Other'), d.nicheCustom].filter(Boolean).join(' / ') || 'lifestyle'
  const p = d.personality ?? 50
  const personalityDesc = p < 30
    ? 'deeply introverted — quiet, internal, does not perform for the camera. Wardrobe should be understated and worn without deliberateness.'
    : p < 50
    ? 'slightly introverted — considered, one intentional choice in the look, otherwise relaxed.'
    : p < 70
    ? 'balanced — casually considered, looks good without looking like effort.'
    : p < 85
    ? 'extroverted — personality pieces starting to appear, visibly intentional, pulls the look together on purpose.'
    : 'highly extroverted — fully expressive, bold and deliberate choices, fully committed to the look.'
  const vibes = d.vibeWords?.length ? d.vibeWords.join(', ') : 'not specified'

  return `Generate a GPT Image 2 prompt for this AI influencer. Every input below drives the output directly.

Name: ${d.name || 'unnamed'}
Gender: ${d.gender || 'unspecified'}
Age: ${d.age || 'mid-20s'}
Niche: ${niche}
Physical description: ${d.physicalDesc || 'not specified — invent something photogenic appropriate for the niche'}
Aesthetic vibe words: ${vibes}
Personality (0=introvert, 100=extrovert): ${p}/100 — ${personalityDesc}
Backstory: ${d.backstory?.trim() || 'not given'}

Key requirements:
- Personality score drives BOTH the wardrobe energy level AND the pose style — they must feel consistent
- Vibe words steer aesthetic direction within the personality's energy range — vary freely, don't lock to one outfit
- Physical description feeds the Subject section exactly and informs the skin block's environmental reaction
- Backstory informs the character energy framing in the Subject section
- 9:16 vertical, no people in background, no logos
- Full skin block with all 10 elements — granular and concrete`
}

// ── Direct prompt builder — all inputs drive output ───────────
export function buildDirectPrompt(d, forcePose = null, options = {}) {
  const nicheArr = Array.isArray(d.niches) && d.niches.length ? d.niches : d.niche ? [d.niche] : []
  const niche = [...nicheArr.filter(n => n !== 'Other'), d.nicheCustom].filter(Boolean).join(' / ') || 'lifestyle'
  const gender = d.gender || 'woman'
  const age = d.age ? `${d.age} year old` : 'mid-20s'
  const physical = d.physicalDesc?.trim() || 'with dark hair, warm complexion, natural features'
  const vibes = d.vibeWords || []
  const personality = d.personality ?? 50
  const backstory = d.backstory?.trim() || ''
  const isEditorial = vibes.includes('Editorial')

  const timeConfig = R(getTimesForNiche(niche))
  const scene = options.forceOutdoor ? R(OUTDOOR_CANDID_SCENES) : R(getScenePool(niche))
  const poseFn = forcePose || getPoseFromPersonality(personality)
  const prop = getProp(niche)
  const wardrobe = selectWardrobe(gender, vibes, personality, niche, d.physicalDesc, d.backstory)
  const camera = getCamera(niche, personality)
  const skinBlock = buildSkinBlock(timeConfig.label, gender, physical)
  const characterFraming = getCharacterFraming(personality, backstory)

  const propDesc = prop
    ? `${prop} held in one hand — no visible brand logo`
    : 'hands in a natural mid-gesture, nothing held'

  const poseName = poseFn === POSES.frontfacing ? 'iPhone portrait — direct, relaxed, facing camera'
    : poseFn === POSES.contemplative ? 'iPhone portrait — quiet, present, facing camera'
    : poseFn === POSES.plandid ? 'iPhone candid — soft awareness, facing camera'
    : poseFn === POSES.posed_cute ? 'iPhone feed shot — soft pose, eyes at lens'
    : 'iPhone candid — mid-moment, eyes at the lens'

  return `Photograph style: iPhone 16 Pro snapshot. Taken by the subject or a nearby friend, handheld, automatic settings. No professional crew, no studio, no lighting setup, no direction given. Raw iPhone output — unedited. The subject is unaware this will be published — a personal photo, not intended for any shoot. This looks exactly like a photo a real person posted to their Instagram story.

Scene: ${scene}, ${timeConfig.label}. Empty of other people. If the location is an interior, it shows real signs of habitation — not a styled showroom. Background is real, in-focus, and unmanipulated exactly as an iPhone captures it — no blur, no bokeh, no artificial depth of field. The subject is the hero through tight framing and natural lighting, not through background manipulation.

Subject: ${gender}, ${age}, ${physical}. ${characterFraming}. Natural micro-asymmetries in the face — this is a real iPhone photograph of a real person, not a 3D render or CGI. Real visible pore texture on the nose, cheeks, and forehead — and on all exposed skin including arms, neck, and shoulders. Zero skin smoothing anywhere on the body, zero airbrushing, zero beauty filter applied.

Pose: ${poseFn(prop)} ${propDesc}.

Wardrobe & details: ${wardrobe}

Lighting: ${timeConfig.lighting} The subject's face is the brightest element in the frame. This is natural found light — not a lighting setup.

Camera & capture: ${camera}.

Skin (rendered as concrete photographic facts, not category words):
${skinBlock}

Use case: ${poseName}

Constraints: no people in the background. No visible brand logos on any item. Subject fills 60–70% of the 9:16 frame — tight crop, not a wide environmental shot. No background blur or bokeh. Real pore texture and skin imperfections visible on the face and all exposed body skin — zero beauty retouching. No AI aesthetic markers: no unnaturally bright irises, no perfectly symmetrical face, no plastic-smooth skin, no uncanny glow. This image is indistinguishable from a personal photo posted on Instagram.${isEditorial ? ' Editorial vibe applies to the styling only — the photo itself is a raw iPhone snapshot.' : ''}`
}

// ── Three distinct variation prompts — different poses per card ─
export function buildThreeVariationPrompts(d) {
  // 1. Front facing: direct, calm, present
  // 2. Front facing (posed cute): soft expression, eyes at lens
  // 3. Candid outdoor: always outside, mid-action, having fun — still hero of the frame
  return [
    buildDirectPrompt(d, POSES.frontfacing),
    buildDirectPrompt(d, POSES.posed_cute),
    buildDirectPrompt(d, POSES.candid, { forceOutdoor: true }),
  ]
}

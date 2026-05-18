// ─── คลังคำแยกหมวด — ใช้ร่วมกันทั้งเกมจับคู่และเกมสะกดคำ ───
// แต่ละ item: { emoji, th (ชื่อไทย), en (ชื่ออังกฤษ) }
// อยากเพิ่ม/แก้ของในเกม แก้ที่ไฟล์นี้ที่เดียว ทั้งสองเกมอัปเดตตาม
const CATEGORIES = {
  animals: {
    label: 'สัตว์',
    items: [
      { emoji: '🐶', th: 'หมา',     en: 'Dog' },
      { emoji: '🐱', th: 'แมว',     en: 'Cat' },
      { emoji: '🐰', th: 'กระต่าย', en: 'Rabbit' },
      { emoji: '🐼', th: 'แพนด้า',  en: 'Panda' },
      { emoji: '🦊', th: 'จิ้งจอก', en: 'Fox' },
      { emoji: '🐻', th: 'หมี',     en: 'Bear' },
      { emoji: '🦁', th: 'สิงโต',   en: 'Lion' },
      { emoji: '🐯', th: 'เสือ',    en: 'Tiger' },
      { emoji: '🐸', th: 'กบ',      en: 'Frog' },
      { emoji: '🐵', th: 'ลิง',     en: 'Monkey' },
      { emoji: '🐨', th: 'โคอาลา',  en: 'Koala' },
      { emoji: '🐮', th: 'วัว',     en: 'Cow' },
      { emoji: '🐷', th: 'หมู',     en: 'Pig' },
      { emoji: '🐘', th: 'ช้าง',    en: 'Elephant' },
      { emoji: '🐠', th: 'ปลา',     en: 'Fish' },
      { emoji: '🐔', th: 'ไก่',     en: 'Chicken' },
      { emoji: '🐦', th: 'นก',      en: 'Bird' },
      { emoji: '🐝', th: 'ผึ้ง',    en: 'Bee' },
      { emoji: '🐢', th: 'เต่า',    en: 'Turtle' },
      { emoji: '🦆', th: 'เป็ด',    en: 'Duck' },
      { emoji: '🐍', th: 'งู',      en: 'Snake' },
      { emoji: '🐴', th: 'ม้า',     en: 'Horse' },
      { emoji: '🐑', th: 'แกะ',     en: 'Sheep' },
      { emoji: '🦋', th: 'ผีเสื้อ', en: 'Butterfly' },
      { emoji: '🐳', th: 'วาฬ',     en: 'Whale' },
      { emoji: '🦉', th: 'นกฮูก',   en: 'Owl' },
    ],
  },
  fruits: {
    label: 'ผลไม้',
    items: [
      { emoji: '🍎', th: 'แอปเปิล',     en: 'Apple' },
      { emoji: '🍐', th: 'สาลี่',       en: 'Pear' },
      { emoji: '🍊', th: 'ส้ม',         en: 'Orange' },
      { emoji: '🍋', th: 'มะนาว',       en: 'Lemon' },
      { emoji: '🍌', th: 'กล้วย',       en: 'Banana' },
      { emoji: '🍉', th: 'แตงโม',       en: 'Watermelon' },
      { emoji: '🍇', th: 'องุ่น',       en: 'Grapes' },
      { emoji: '🍓', th: 'สตรอว์เบอร์รี', en: 'Strawberry' },
      { emoji: '🫐', th: 'บลูเบอร์รี',  en: 'Blueberry' },
      { emoji: '🍈', th: 'เมล่อน',      en: 'Melon' },
      { emoji: '🍒', th: 'เชอร์รี',     en: 'Cherry' },
      { emoji: '🍑', th: 'ลูกพีช',      en: 'Peach' },
      { emoji: '🥭', th: 'มะม่วง',      en: 'Mango' },
      { emoji: '🍍', th: 'สับปะรด',     en: 'Pineapple' },
      { emoji: '🥥', th: 'มะพร้าว',     en: 'Coconut' },
      { emoji: '🥝', th: 'กีวี',        en: 'Kiwi' },
      { emoji: '🍅', th: 'มะเขือเทศ',   en: 'Tomato' },
      { emoji: '🥑', th: 'อะโวคาโด',    en: 'Avocado' },
      { emoji: '🍆', th: 'มะเขือ',      en: 'Eggplant' },
      { emoji: '🥕', th: 'แครอท',       en: 'Carrot' },
    ],
  },
  colors: {
    label: 'สี',
    items: [
      { emoji: '🔴', th: 'สีแดง',     en: 'Red' },
      { emoji: '🟠', th: 'สีส้ม',     en: 'Orange' },
      { emoji: '🟡', th: 'สีเหลือง',  en: 'Yellow' },
      { emoji: '🟢', th: 'สีเขียว',   en: 'Green' },
      { emoji: '🔵', th: 'สีน้ำเงิน', en: 'Blue' },
      { emoji: '🟣', th: 'สีม่วง',    en: 'Purple' },
      { emoji: '🟤', th: 'สีน้ำตาล',  en: 'Brown' },
      { emoji: '⚫', th: 'สีดำ',      en: 'Black' },
      { emoji: '⚪', th: 'สีขาว',     en: 'White' },
      { emoji: '🩷', th: 'สีชมพู',    en: 'Pink' },
    ],
  },
  objects: {
    label: 'ของใช้',
    items: [
      { emoji: '🚗', th: 'รถยนต์',    en: 'Car' },
      { emoji: '🚌', th: 'รถบัส',     en: 'Bus' },
      { emoji: '🚲', th: 'จักรยาน',   en: 'Bicycle' },
      { emoji: '✈️', th: 'เครื่องบิน', en: 'Airplane' },
      { emoji: '🚀', th: 'จรวด',      en: 'Rocket' },
      { emoji: '⚽', th: 'ลูกบอล',    en: 'Ball' },
      { emoji: '🎈', th: 'ลูกโป่ง',   en: 'Balloon' },
      { emoji: '🎁', th: 'ของขวัญ',   en: 'Gift' },
      { emoji: '📚', th: 'หนังสือ',   en: 'Book' },
      { emoji: '✏️', th: 'ดินสอ',     en: 'Pencil' },
      { emoji: '🪑', th: 'เก้าอี้',   en: 'Chair' },
      { emoji: '🛏️', th: 'เตียง',     en: 'Bed' },
      { emoji: '🧸', th: 'ตุ๊กตาหมี', en: 'Teddy Bear' },
      { emoji: '🎸', th: 'กีตาร์',    en: 'Guitar' },
      { emoji: '🥁', th: 'กลอง',      en: 'Drum' },
      { emoji: '🥄', th: 'ช้อน',      en: 'Spoon' },
      { emoji: '🔑', th: 'กุญแจ',     en: 'Key' },
      { emoji: '📱', th: 'โทรศัพท์',  en: 'Phone' },
      { emoji: '🪥', th: 'แปรงสีฟัน', en: 'Toothbrush' },
      { emoji: '👟', th: 'รองเท้า',   en: 'Shoe' },
      { emoji: '🧢', th: 'หมวก',      en: 'Hat' },
      { emoji: '⏰', th: 'นาฬิกา',    en: 'Clock' },
      { emoji: '☂️', th: 'ร่ม',       en: 'Umbrella' },
      { emoji: '✂️', th: 'กรรไกร',    en: 'Scissors' },
    ],
  },
};

// ลำดับหมวดสำหรับปุ่มตั้งค่า
const CATEGORY_KEYS = ['animals', 'fruits', 'colors', 'objects'];

// คืน array ของ item ตามหมวดที่เลือก — 'all' = รวมทุกหมวด
function getCategoryPool(key) {
  if (key === 'all') return CATEGORY_KEYS.flatMap(k => CATEGORIES[k].items);
  return (CATEGORIES[key] || CATEGORIES.animals).items;
}

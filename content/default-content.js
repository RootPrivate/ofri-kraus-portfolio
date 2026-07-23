export const defaultContent = {
  schemaVersion: 1,
  revision: "default",
  updatedAt: null,
  site: {
    brandName: "עופרי קראוס",
    pageTitle: "עופרי קראוס | הפקת פרסומות וסרטי מותג",
    metaDescription: "עופרי קראוס יוצר פרסומות וסרטי מותג קולנועיים לעסקים בתחומי הפיטנס, הוולנס, הנדל״ן, השירות והמסעדנות.",
    nav: {
      work: "סרטים",
      stills: "סטילס",
      about: "אודות",
      contact: "בואו נדבר"
    }
  },
  appearance: {
    accent: "#3A6963",
    background: "#090C0F",
    surface: "#12181D",
    text: "#F1F5F7",
    radius: 16,
    fontPreset: "heebo",
    density: "comfortable",
    motion: true
  },
  sectionOrder: ["hero", "discipline", "work", "stills", "about", "contact"],
  sectionVisibility: {
    hero: true,
    discipline: true,
    work: true,
    stills: true,
    about: true,
    contact: true
  },
  hero: {
    title: "עופרי קראוס",
    description: "אני מפיק, מצלם, עורך ויוצר פרסומות שמחברות את הצופה וממתגות את העסק שלך.",
    primaryCta: { "label": "לצפייה בעבודות", "href": "#work" },
    secondaryCta: { "label": "בואו נדבר", "href": "#contact" },
    backgroundImage: "assets/optimized/hero-960.webp",
    mainImage: "assets/optimized/hero-960.webp",
    topImage: "assets/optimized/thumb-01.webp",
    bottomImage: "assets/optimized/photo-02.webp"
  },
  discipline: {
    items: ["פרסומות", "סרטי מותג", "תוכן לרשתות"]
  },
  work: {
    title: "מאחורי כל סרטון עומד סיפור",
    description: "שיווק לא חייב להיות ישיר. כל פרסומת שאתם רואים מספרת סיפור בצורה כזו שגורמת לכם להרגיש משהו. טוב, רע, כעס, עצב, הזדהות - מכירה זו אומנות. ובזה אני מתמחה.",
    projects: [
      {
        "id": "magnum",
        "title": "פרסומת למגנום",
        "format": "vertical",
        "mediaType": "video",
        "mediaSrc": "assets/project-01.mp4",
        "poster": "assets/optimized/thumb-01.webp",
        "alt": "מאמן כושר מציג גלידת מגנום בחלל צבעוני"
      },
      {
        "id": "product",
        "title": "מוצר",
        "format": "vertical",
        "mediaType": "video",
        "mediaSrc": "https://pub-8e9cd0f0204c4ad0b231e6f32feea426.r2.dev/project-02.mp4",
        "poster": "assets/optimized/thumb-02.webp",
        "alt": "תקריב קולנועי של מוצר על רקע כתום"
      },
      {
        "id": "professional-content",
        "title": "תוכן מקצועי",
        "format": "vertical",
        "mediaType": "video",
        "mediaSrc": "https://pub-8e9cd0f0204c4ad0b231e6f32feea426.r2.dev/project-03.mp4",
        "poster": "assets/optimized/thumb-03.webp",
        "alt": "איש מקצוע מדבר למצלמה בחלל בהיר"
      },
      {
        "id": "restaurant",
        "title": "מסעדנות",
        "format": "vertical",
        "mediaType": "video",
        "mediaSrc": "https://pub-8e9cd0f0204c4ad0b231e6f32feea426.r2.dev/project-04.mp4",
        "poster": "assets/optimized/thumb-04.webp",
        "alt": "אדם לצד אופניים בבית קפה אורבני"
      },
      {
        "id": "lifestyle",
        "title": "לייפסטייל",
        "format": "vertical",
        "mediaType": "video",
        "mediaSrc": "assets/project-05.mp4",
        "poster": "assets/optimized/thumb-05.webp",
        "alt": "פרט אדריכלי גאומטרי באור וצל"
      },
      {
        "id": "service",
        "title": "שירות",
        "format": "vertical",
        "mediaType": "video",
        "mediaSrc": "https://pub-8e9cd0f0204c4ad0b231e6f32feea426.r2.dev/project-06.mp4",
        "poster": "assets/optimized/thumb-06.webp",
        "alt": "לחיצת יד כחלק מסיפור על שירות ואמון"
      },
      {
        "id": "sport",
        "title": "ספורט",
        "format": "vertical",
        "mediaType": "video",
        "mediaSrc": "assets/project-07.mp4",
        "poster": "assets/optimized/thumb-07.webp",
        "alt": "מתאמן בחדר כושר תחת תאורה דרמטית"
      },
      {
        "id": "human-story",
        "title": "סיפור אנושי",
        "format": "wide",
        "mediaType": "video",
        "mediaSrc": "https://pub-8e9cd0f0204c4ad0b231e6f32feea426.r2.dev/project-08.mp4",
        "poster": "assets/optimized/thumb-08.webp",
        "alt": "סצנה אורבנית בשחור לבן מתוך סרט תדמית"
      },
      {
        "id": "real-estate",
        "title": "נדל״ן",
        "format": "wide",
        "mediaType": "video",
        "mediaSrc": "https://pub-8e9cd0f0204c4ad0b231e6f32feea426.r2.dev/project-09.mp4",
        "poster": "assets/optimized/thumb-09.webp",
        "alt": "חזית מגדל משרדים כחול מתוך סרט נדל״ן"
      }
    ]
  },
  stills: {
    title: "פחות ממאית השניה",
    description: "תמונות זה לא רק תיעוד. הידעתם? תמונה ממוצעת מראה פחות ממאית השניה. אותו חלקיק שניה שאתם רואים כתמונה ערוכה היא לא רק מזכרת יפה, היא חלק מאסטרטגיית תוכן שתשרת אתכם, כי התמונות האלה, עם קריאייטיב נכון, יביאו את הלקוח הבא שלכם.",
    items: [
      { "id": "still-01", "title": "צילום לילי", "src": "assets/optimized/photo-01.webp", "alt": "צילום לילי אמנותי בגווני אדום עם אורות מטושטשים" },
      { "id": "still-02", "title": "חוף ים", "src": "assets/optimized/photo-02.webp", "alt": "חוף ים וגלים עם דמות מטושטשת בחזית" },
      { "id": "still-03", "title": "דיוקן", "src": "assets/optimized/photo-03.webp", "alt": "דיוקן קולנועי של גבר מבוגר מחזיק כוס" },
      { "id": "still-04", "title": "מרחב", "src": "assets/optimized/photo-04.webp", "alt": "צילום מלמעלה של אדם במרחב אדריכלי" },
      { "id": "still-05", "title": "מאחורי הקלעים", "src": "assets/optimized/photo-05.webp", "alt": "שני גברים בשיחה בחלל מואר באדום" },
      { "id": "still-06", "title": "מסעדנות", "src": "assets/optimized/photo-06.webp", "alt": "צילום מסעדה של הכנת מנה מול קהל" },
      { "id": "still-07", "title": "חלון", "src": "assets/optimized/photo-07.webp", "alt": "דמויות מביטות מחלון בית בגוון כתום" },
      { "id": "still-08", "title": "אופנה", "src": "assets/optimized/photo-08.webp", "alt": "דיוקן של גבר בחולצה שחורה וכובע" },
      { "id": "still-09", "title": "אירוע", "src": "assets/optimized/photo-09.webp", "alt": "זמרת מופיעה על במה תחת תאורה אדומה" },
      { "id": "still-10", "title": "איור", "src": "assets/optimized/photo-10.webp", "alt": "תקריב של איור עין בעיפרון" }
    ]
  },
  about: {
    title: "אני בונה אסטרטגיות תוכן",
    paragraphs: [
      "בשנים האחרונות צילמתי עבור מותגים ועבור עצמי, ולמדתי שהפרסומות שאנשים זוכרים ואוהבים לראות הן לרוב לא הרועשות ביותר.",
      "היום אני עובד עם חדרי כושר, עסקים בתחומי הפיטנס, הוולנס, הנדל״ן, השירות והמסעדנות. המטרה היא לספר את הסיפור שלהם באותה תשומת לב שהם השקיעו בלבנות אותו."
    ],
    image: "assets/optimized/hero.webp",
    imageAlt: "עופרי קראוס עומד בחוץ ומחזיק מצלמה"
  },
  contact: {
    titleLineOne: "ספרו לי מה אתם",
    titleLineTwo: "רוצים למתג.",
    description: "לשיחת ייעוץ ללא עלות השאירו פרטים.",
    whatsappLabel: "לשיחת ייעוץ ב-WhatsApp",
    whatsappUrl: "https://wa.me/972558818785",
    emailLabel: "אימייל",
    email: "ofrikr60@gmail.com",
    phoneLabel: "טלפון",
    phoneDisplay: "055-881-8785",
    phoneHref: "tel:+972558818785"
  },
  footer: {
    copyrightName: "עופרי קראוס",
    instagramLabel: "Instagram",
    instagramUrl: "https://instagram.com/ofrikraus",
    whatsappLabel: "WhatsApp"
  }
};

export function cloneDefaultContent() {
  return structuredClone(defaultContent);
}

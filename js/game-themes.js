export const themes = [
 {name:'Mặc định',card:0x0d1c4a,ink:0xffffff,accent:0x65c9ff},
 {name:'Tiên sơn',card:0xfff4d2,ink:0x523047,accent:0xe7b837},
 {name:'Đào tiên',card:0xfff3d9,ink:0x4c244a,accent:0xe6b94b},
 {name:'Trúc lâm',card:0xfff6de,ink:0x49344a,accent:0xd8a826},
 {name:'Tiên giới 3D',card:0xfff9ed,ink:0x1b3a54,accent:0xc9a865},
 {name:'Thủy mặc',card:0xf5e8cc,ink:0x793b2c,accent:0x9e5946},
 {name:'Chibi',card:0xffe9eb,ink:0x532c63,accent:0xdd9aad},
 {name:'Điện ảnh',card:0xf6e9cf,ink:0x332a25,accent:0xb0925d},
 {name:'Cung đình',card:0xffefd0,ink:0x5d130e,accent:0xc4942f},
 {name:'Cực quang',card:0xe6f5ff,ink:0x153969,accent:0x8cbedb},
 {name:'Biển trời',card:0xf2fbfc,ink:0x18566c,accent:0x6acbd0},
];
export function getGameTheme(id) { const index = Number(id); return Number.isInteger(index) && index >= 0 && index < themes.length ? themes[index] : themes[0]; }

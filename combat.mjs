export const skills = {
  kiem: ['Kiếm khí', 'Liên trảm', 'Vạn kiếm', 'Kiếm trận', 'Kim Long'],
  huyen: ['Hỏa phù', 'Lôi kích', 'Phong ấn', 'Khóa chiêu', 'Thiên Lôi'],
  linh: ['Hồi máu', 'Khiên ngọc', 'Giải độc', 'Hồi sinh', 'Phượng Hoàng']
};

export function selectGiftSkill(faction, unitCoins, count) {
  if (!Object.hasOwn(skills, faction)) return null;
  if (![unitCoins, count].every(n => Number.isSafeInteger(n) && n > 0)) return null;
  const coins = unitCoins * count;
  const tier = [5, 20, 100, 500].filter(min => coins >= min).length;
  return { tier: tier + 1, name: skills[faction][tier], coins };
}

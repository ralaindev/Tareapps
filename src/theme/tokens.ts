export const lightColors = {
  background: '#F7F7FC',
  surface: '#FFFFFF',
  primary: '#6D4AFF',
  primarySoft: '#EEE9FF',
  text: '#20212B',
  muted: '#626575',
  border: '#E7E5EF',
  danger: '#B32946',
  success: '#28745A',
  deleteBackground: '#C83550',
  onDeleteBackground: '#FFFFFF',
  track: '#EEEBF5',
  successSoft: '#E8F5EE',
  button: '#6D4AFF',
  onButton: '#FFFFFF',
  notice: '#20212B',
  onNotice: '#FFFFFF',
  noticeAction: '#D6CAFF',
  cardShadow: '0 8px 24px #3020500A',
  subtleShadow: '0 2px 8px #3020500D',
  buttonShadow: '0 6px 16px #6D4AFF22',
};

export type Palette = { [Key in keyof typeof lightColors]: string };
export const darkColors: Palette = {
  background: '#14121B', surface: '#201D2C', primary: '#B9A4FF', primarySoft: '#302743',
  text: '#F6F2FF', muted: '#B8B1C8', border: '#3B3449', danger: '#FF9BB0', success: '#80D5B0',
  track: '#272231', successSoft: '#19392F', button: '#7652DD', onButton: '#FFFFFF',
  deleteBackground: '#A72D46', onDeleteBackground: '#FFFFFF',
  notice: '#332D43', onNotice: '#F6F2FF', noticeAction: '#D6CAFF',
  cardShadow: '0 8px 24px #00000026', subtleShadow: '0 2px 8px #00000020', buttonShadow: '0 6px 16px #00000026',
};

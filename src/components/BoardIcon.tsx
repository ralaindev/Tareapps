import Svg, { Circle, Path, Rect } from 'react-native-svg';

export function BoardIcon({ name, color }: { name: 'compact' | 'detailed' | 'sun' | 'moon' | 'trash'; color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
    {name === 'compact' && <>
      <Path d="M8 5h13M8 12h13M8 19h13" />
      <Circle cx={3} cy={5} r={0.8} /><Circle cx={3} cy={12} r={0.8} /><Circle cx={3} cy={19} r={0.8} />
    </>}
    {name === 'detailed' && <>
      <Rect x={3} y={3} width={18} height={7} rx={2} />
      <Rect x={3} y={14} width={18} height={7} rx={2} />
    </>}
    {name === 'sun' && <>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
    </>}
    {name === 'moon' && <Path d="M20.5 13.2A8.5 8.5 0 0 1 10.8 3.5a8.5 8.5 0 1 0 9.7 9.7Z" />}
    {name === 'trash' && <>
      <Path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
    </>}
  </Svg>;
}

interface Ids { idPrefix?: string }
declare const LukasArt: {
  face(opts?: Ids & { sleeping?: boolean }): string;
  icon(opts?: Ids & { bg?: string; ink?: string; eye?: string; calico?: string; radius?: number }): string;
  sleepingPot(opts?: Ids): string;
  peek(opts?: Ids): string;
  sprout(): string;
  leaf(fill?: string): string;
};
export default LukasArt;

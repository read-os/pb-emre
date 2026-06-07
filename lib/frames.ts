// Dynamic frame loading

export interface Frame {
  id: string;
  name: string;
  src: string;
  category: "default" | "skz";
}

// These lists are derived from the actual files in /public/frames
// The system auto-discovers them via the API route

export const DEFAULT_FRAMES: Frame[] = [
  { id: "default-1", name: "AcampaDentro 1", src: "/frames/default/frame-1.png", category: "default" },
  { id: "default-2", name: "AcampaDentro 2", src: "/frames/default/frame-2.png", category: "default" },
];

export const SKZ_FRAMES: Frame[] = [
  { id: "skz-bangchan", name: "Bang Chan", src: "/frames/skz/bangchan.jpg", category: "skz" },
  { id: "skz-changbin", name: "Changbin", src: "/frames/skz/changbin.jpg", category: "skz" },
  { id: "skz-felix", name: "Felix", src: "/frames/skz/felix.jpg", category: "skz" },
  { id: "skz-hyunjin", name: "Hyunjin", src: "/frames/skz/hyunjin.jpg", category: "skz" },
  { id: "skz-in", name: "I.N", src: "/frames/skz/in.jpg", category: "skz" },
  { id: "skz-leeknow", name: "Lee Know", src: "/frames/skz/leeknow.jpg", category: "skz" },
  { id: "skz-seungmin", name: "Seungmin", src: "/frames/skz/seungmin.jpg", category: "skz" },
];

export const SECRET_CODE = "143";

export const requirements = {
  topic: "量子比特的测量", level: "初级", goal: "掌握 Born 规则", slideCount: 2,
  material: "对于归一化纯态 α|0⟩+β|1⟩，在计算基测量时，得到 0 的概率为 |α|²，得到 1 的概率为 |β|²。两个概率之和为 1。",
};

export function fixtureResponses() {
  const title = "量子比特的测量";
  const slide = (heading) => ({ elements: [{
    id: "heading", type: "text", left: 65, top: 60, width: 870, height: 90,
    content: `<p style="font-size:36px;color:#215a40">${heading}</p>`,
    defaultFontName: "Arial", defaultColor: "#215a40",
  }, {
    id: "body", type: "text", left: 65, top: 190, width: 870, height: 250,
    content: "<p style=\"font-size:26px\">对于 α|0⟩+β|1⟩，在计算基测量时：</p><p style=\"font-size:28px\">P(0) = |α|²，P(1) = |β|²</p><p style=\"font-size:24px\">归一化条件保证两个概率之和为 1。</p>",
    defaultFontName: "Arial", defaultColor: "#33483b",
  }], background: { type: "solid", color: "#ffffff" } });
  return [
    { courseTitle: title, outlines: [
      { type: "slide", title: "从量子态到测量", description: "计算基测量", keyPoints: ["概率幅与概率"] },
      { type: "slide", title: "Born 规则与归一化", description: "测量概率", keyPoints: ["概率和为 1"] },
      { type: "quiz", title: "随堂练习", description: "计算测量概率", keyPoints: ["Born 规则"] },
    ] },
    slide("从量子态到测量"), [{ type: "text", content: requirements.material }],
    slide("Born 规则与归一化"), [{ type: "text", content: "测量概率取决于所选的测量基。在计算基中，可直接用这两个概率幅的模平方。" }],
    [{ id: "q1", type: "single", question: "归一化态 |0⟩ 在计算基测量得到 0 的概率是多少？", options: [{ label: "0", value: "A" }, { label: "1", value: "B" }], answer: ["B"], hasAnswer: true, analysis: "|0⟩ 对应的概率幅为 1，其模平方为 1。" }],
    [{ type: "text", content: "请先独立作答，再查看参考答案与解析。" }],
  ].map((value) => JSON.stringify(value));
}

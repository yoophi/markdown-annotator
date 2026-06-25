import type { Meta, StoryObj } from "@storybook/react-vite";
import { MarkdownViewer } from "@/shared/ui/MarkdownViewer";

const meta = {
  title: "Molecules/MarkdownViewer",
  component: MarkdownViewer,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof MarkdownViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    markdown: `# Markdown Viewer

- GFM 목록
- **강조 텍스트**

| 영역 | 역할 |
| --- | --- |
| Renderer | Markdown 렌더링 |
| Selection | 선택 anchor 생성 |
`,
  },
};

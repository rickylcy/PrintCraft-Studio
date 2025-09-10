import { prisma } from "@/lib/db";
import Editor from "@/components/editor/Editor";

export default async function EditTemplatePage({ params }) {
  const tpl = await prisma.template.findUnique({
    where: { id: params.id },
    include: { profile: true },
  });
  if (!tpl) return <div className="p-6">Template not found.</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold ">Edit: {tpl.name}</h1>
      <Editor
        templateId={tpl.id}
        initialName={tpl.name}
        initialContent={JSON.parse(tpl.contentJson || '{"blocks":[]}')}
        type={tpl.type}
        initialProfileId={tpl.profileId || ""}
      />
    </div>
  );
}

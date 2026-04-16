'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Heading2, Code, Link as LinkIcon, Minus, Undo, Redo, ImageIcon
} from 'lucide-react';
import Image from '@tiptap/extension-image';
import { cn } from '@/lib/utils/cn';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  minimal?: boolean;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Escreva aqui...',
  editable = true,
  minimal = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-accent underline cursor-pointer' },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-2',
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-invert prose-sm max-w-none outline-none min-h-[80px] px-3 py-2 text-slate-300',
          minimal && 'min-h-[40px]'
        ),
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return false;

            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              if (base64) {
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: base64 })
                  )
                );
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Sync content from outside
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  function setLink() {
    const url = window.prompt('URL do link:');
    if (url) {
      editor!.chain().focus().setLink({ href: url }).run();
    }
  }

  function insertImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (base64 && editor) {
          editor.chain().focus().setImage({ src: base64 }).run();
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  const toolbarButtons = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: 'Negrito' },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: 'Itálico' },
    { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), title: 'Sublinhado' },
    'separator',
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), title: 'Título' },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), title: 'Lista' },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), title: 'Lista numerada' },
    'separator',
    { icon: Code, action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock'), title: 'Código' },
    { icon: LinkIcon, action: setLink, active: editor.isActive('link'), title: 'Link' },
    { icon: ImageIcon, action: insertImage, active: false, title: 'Imagem' },
    { icon: Minus, action: () => editor.chain().focus().setHorizontalRule().run(), active: false, title: 'Divisor' },
    'separator',
    { icon: Undo, action: () => editor.chain().focus().undo().run(), active: false, title: 'Desfazer' },
    { icon: Redo, action: () => editor.chain().focus().redo().run(), active: false, title: 'Refazer' },
  ];

  return (
    <div className="rounded-lg border border-border/40 bg-surface overflow-hidden">
      {/* Toolbar */}
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border/30 bg-surface2/50 px-2 py-1">
          {toolbarButtons.map((btn, i) => {
            if (btn === 'separator') {
              return <div key={i} className="mx-1 h-4 w-px bg-border/40" />;
            }
            const { icon: Icon, action, active, title } = btn as any;
            return (
              <button
                key={i}
                type="button"
                onClick={action}
                title={title}
                className={cn(
                  'rounded p-1 transition',
                  active
                    ? 'bg-accent/20 text-accent'
                    : 'text-slate-500 hover:bg-surface hover:text-slate-200'
                )}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

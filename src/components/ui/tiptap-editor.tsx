import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { Toggle } from "@/components/ui/toggle"
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    List,
    ListOrdered,
    Link as LinkIcon,
    Image as ImageIcon,
    Table as TableIcon,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Plus,
    Trash2,
    Merge,
    Split,
    Undo,
    Redo
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface TiptapEditorProps {
    value: string
    onChange: (value: string) => void
    className?: string
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) {
        return null
    }

    const addImage = () => {
        const url = window.prompt('URL')
        if (url) {
            editor.chain().focus().setImage({ src: url }).run()
        }
    }

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href
        const url = window.prompt('URL', previousUrl)

        if (url === null) {
            return
        }

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            return
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }

    return (
        <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-t-md border-b sticky top-0 z-10 backdrop-blur-sm">
            <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Toggle
                    size="sm"
                    pressed={editor.isActive('bold')}
                    onPressedChange={() => editor.chain().focus().toggleBold().run()}
                    aria-label="Bold"
                >
                    <Bold className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive('italic')}
                    onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                    aria-label="Italic"
                >
                    <Italic className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive('underline')}
                    onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
                    aria-label="Underline"
                >
                    <UnderlineIcon className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive('strike')}
                    onPressedChange={() => editor.chain().focus().toggleStrike().run()}
                    aria-label="Strikethrough"
                >
                    <Strikethrough className="h-4 w-4" />
                </Toggle>
            </div>

            <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Toggle
                    size="sm"
                    pressed={editor.isActive('bulletList')}
                    onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                    aria-label="Bullet List"
                >
                    <List className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive('orderedList')}
                    onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                    aria-label="Ordered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </Toggle>
            </div>

            <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Toggle
                    size="sm"
                    pressed={editor.isActive({ textAlign: 'left' })}
                    onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
                    aria-label="Align Left"
                >
                    <AlignLeft className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive({ textAlign: 'center' })}
                    onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
                    aria-label="Align Center"
                >
                    <AlignCenter className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive({ textAlign: 'right' })}
                    onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
                    aria-label="Align Right"
                >
                    <AlignRight className="h-4 w-4" />
                </Toggle>
            </div>

            <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Button size="sm" variant="ghost" onClick={setLink} className={cn("h-8 w-8 p-0", editor.isActive('link') && "bg-muted")}>
                    <LinkIcon className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={addImage} className="h-8 w-8 p-0">
                    <ImageIcon className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex items-center gap-1">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                    title="Insert Table"
                    className="h-8 w-8 p-0"
                >
                    <TableIcon className="h-4 w-4" />
                </Button>

                {editor.isActive('table') && (
                    <>
                        <div className="w-px h-6 bg-border mx-1" />
                        <div className="flex items-center gap-0.5 animate-in fade-in slide-in-from-left-5">
                            <div className="flex flex-col gap-0.5">
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0" title="Add Column Before" onClick={() => editor.chain().focus().addColumnBefore().run()}><Plus className="h-3 w-3 rotate-90" /></Button>
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0" title="Add Column After" onClick={() => editor.chain().focus().addColumnAfter().run()}><Plus className="h-3 w-3 rotate-90" /></Button>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0" title="Add Row Before" onClick={() => editor.chain().focus().addRowBefore().run()}><Plus className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0" title="Add Row After" onClick={() => editor.chain().focus().addRowAfter().run()}><Plus className="h-3 w-3" /></Button>
                            </div>
                            <div className="w-px h-6 bg-border mx-1" />
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" title="Delete Column" onClick={() => editor.chain().focus().deleteColumn().run()}><Trash2 className="h-4 w-4 rotate-90" /></Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" title="Delete Row" onClick={() => editor.chain().focus().deleteRow().run()}><Trash2 className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" title="Delete Table" onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 className="h-4 w-4" /></Button>
                            <div className="w-px h-6 bg-border mx-1" />
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Merge Cells" onClick={() => editor.chain().focus().mergeCells().run()}><Merge className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Split Cell" onClick={() => editor.chain().focus().splitCell().run()}><Split className="h-4 w-4" /></Button>
                        </div>
                    </>
                )}
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo className="h-4 w-4" /></Button>
            </div>
        </div>
    )
}

const TiptapEditor = ({ value, onChange, className }: TiptapEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'border-collapse table-auto w-full',
                },
            }),
            TableRow,
            TableHeader,
            TableCell.configure({
                HTMLAttributes: {
                    class: 'border border-border p-2',
                }
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline cursor-pointer',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-lg max-w-full h-auto',
                }
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base lg:prose-lg max-w-none m-4 focus:outline-none min-h-[300px]',
            },
        }
    })

    // Handle external value changes (e.g. initial load)
    useEffect(() => {
        if (editor && value && value !== editor.getHTML()) {
            if (!editor.isFocused) {
                editor.commands.setContent(value)
            }
        }
    }, [value, editor])


    return (
        <div className={cn("border rounded-md overflow-hidden bg-white shadow-sm flex flex-col", className)}>
            <MenuBar editor={editor} />
            <div className="flex-1 overflow-auto bg-white/50">
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}

export default TiptapEditor

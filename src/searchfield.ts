import {EditorView, keymap} from "@codemirror/view";
import {insertNewline} from "@codemirror/commands";

export default function createSearchField(doc: string, parent: Element, onSearch: (query: string) => void) {
    return new EditorView({
        doc, parent,
        extensions: [
            EditorView.lineWrapping,
            EditorView.theme({
                ".cm-content": {
                    padding: "0",
                    fontFamily: "sans-serif",
                },
                ".cm-line": {
                    padding: "0",
                },
                "&.cm-focused": {
                    outline: "none",
                },
            }),
            keymap.of([
                {
                    key: "Enter",
                    run: (view: EditorView) => {
                        onSearch(view.state.doc.toString());
                        return true;
                    }
                },
                {
                    key: "Mod-Enter",
                    run: insertNewline
                }
            ])
        ]
    });
}

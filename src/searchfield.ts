import {EditorView, keymap} from "@codemirror/view";
import {insertNewline} from "@codemirror/commands";
import {autocompletion, CompletionContext, CompletionResult} from "@codemirror/autocomplete";

interface Entity {
    id: string;
    type: string;
    preferred: string;
    alternative: string[];
    hidden: string[];
}

export default function createSearchField(doc: string, parent: Element, onSearch: (query: string) => void, entities?: Entity[]) {
    function entityCompletionSource(context: CompletionContext): CompletionResult | null {
        const word = context.matchBefore(/\w*/);
        if (!entities || !word || (word.from === word.to && !context.explicit))
            return null;

        const search = word.text.toString().toLowerCase();

        return {
            filter: false,
            from: word.from,
            options: entities.filter(entity => {
                const preferredMatch = entity.preferred.toLowerCase().indexOf(search) > -1;
                const alternativeMatch = entity.alternative.find(alternative => alternative.toLowerCase().indexOf(search) > -1);
                const hiddenMatch = entity.hidden.find(hidden => hidden.toLowerCase().indexOf(search) > -1);

                return preferredMatch || alternativeMatch || hiddenMatch;
            }).map(entity => ({
                type: "property",
                label: entity.preferred,
                info: [...entity.alternative, ...entity.hidden].join(", ")
            })),
        };
    }

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
            ]),
            autocompletion({
                override: [entityCompletionSource]
            }),
        ]
    });
}

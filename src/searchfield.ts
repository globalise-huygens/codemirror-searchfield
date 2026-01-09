import {standardKeymap} from "@codemirror/commands";
import {
    Decoration,
    WidgetType,
    EditorView,
    MatchDecorator,
    ViewPlugin,
    DecorationSet,
    ViewUpdate,
    keymap
} from "@codemirror/view";
import {autocompletion, CompletionContext, CompletionResult} from "@codemirror/autocomplete";

interface MinimalEntity {
    id: string;
    type: string;
    label: string;
}

interface Entity extends MinimalEntity {
    alternatives: string[];
}

class EntityWidget extends WidgetType {
    constructor(private entity: MinimalEntity) {
        super();
    }

    eq(other: WidgetType) {
        return other instanceof EntityWidget && this.entity.id === other.entity.id;
    }

    toDOM() {
        const el = document.createElement("span");
        el.textContent = this.entity.label;
        el.style.cssText = `
            border-radius: 4px;
            padding: 2px 4px;
            background: #eef;`;
        return el;
    }
}

const entityMatcher = new MatchDecorator({
    regexp: /({"id":.*?,"type":.*?,"label":.*?})/g,
    decoration: match => Decoration.replace({
        widget: new EntityWidget(JSON.parse(match[1]))
    }),
});

const placeholders = ViewPlugin.fromClass(class {
    placeholders: DecorationSet;

    constructor(view: EditorView) {
        this.placeholders = entityMatcher.createDeco(view);
    }

    update(update: ViewUpdate) {
        this.placeholders = entityMatcher.updateDeco(update, this.placeholders);
    }
}, {
    decorations: instance => instance.placeholders,
    provide: plugin => EditorView.atomicRanges.of(view =>
        view.plugin(plugin)?.placeholders || Decoration.none),
});

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
                const labelMatch = entity.label.toLowerCase().indexOf(search) > -1;
                const altMatch = entity.alternatives.find(alt => alt.toLowerCase().indexOf(search) > -1);

                return labelMatch || altMatch;
            }).map(entity => ({
                type: "property",
                label: entity.label,
                info: entity.alternatives.join(", "),
                apply: JSON.stringify({id: entity.id, type: entity.type, label: entity.label}),
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
                ...standardKeymap
            ]),
            autocompletion({
                override: [entityCompletionSource]
            }),
            placeholders
        ]
    });
}

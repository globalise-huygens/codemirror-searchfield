import {history, undo, redo, undoDepth, redoDepth, standardKeymap, historyKeymap} from "@codemirror/commands";
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
import {autocompletion, Completion, CompletionContext, CompletionResult} from "@codemirror/autocomplete";
import crossIconText from "./cross.svg";

const parser = new DOMParser();
const crossIconDoc = parser.parseFromString(crossIconText, "image/svg+xml");
const crossIcon = crossIconDoc.documentElement as unknown as SVGElement;

interface EntityTypeRef {
    color: string;
    icon: SVGElement;
}

interface MinimalEntity {
    id: string;
    type: string;
    label: string;
}

interface Entity extends MinimalEntity {
    alternatives: string[];
}

export interface SearchFieldConfig {
    doc: string;
    parent: Element;
    onSearch: (query: string) => void;
    onUpdate: (canUndo: boolean, canRedo: boolean) => void;
    types: Record<string, EntityTypeRef>;
    entities?: Entity[];
}

export interface SearchFieldActions {
    search: () => void;
    undo: () => void;
    redo: () => void;
}

export default function createSearchField({
                                              doc,
                                              parent,
                                              onSearch,
                                              onUpdate,
                                              types,
                                              entities
                                          }: SearchFieldConfig): SearchFieldActions {
    class EntityWidget extends WidgetType {
        private typeRef: EntityTypeRef;

        constructor(private entity: MinimalEntity) {
            super();
            this.typeRef = types[entity.type];
        }

        eq(other: WidgetType) {
            return other instanceof EntityWidget && this.entity.id === other.entity.id;
        }

        toDOM(view: EditorView) {
            const el = document.createElement("span");
            el.classList = "cm-entity";
            el.style.setProperty("--cm-entity-color", this.typeRef.color);

            const icon = this.typeRef.icon.cloneNode(true) as SVGElement;
            icon.classList = "cm-entity-icon";

            const cross = crossIcon.cloneNode(true) as SVGElement;
            cross.classList = "cm-entity-cross";
            cross.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();

                const pos = view.posAtDOM(el);
                if (pos != null) {
                    view.plugin(entitiesPlugin)?.entities.between(pos, pos, (from, to) =>
                        view.dispatch({changes: {from, to, insert: ""}}));
                }
            });

            el.append(icon, document.createTextNode(this.entity.label), cross);
            return el;
        }
    }

    const entityMatcher = new MatchDecorator({
        regexp: /({"id":.*?,"type":.*?,"label":.*?})/g,
        decoration: match => Decoration.replace({
            widget: new EntityWidget(JSON.parse(match[1]))
        }),
    });

    const entitiesPlugin = ViewPlugin.fromClass(class {
        entities: DecorationSet;

        constructor(view: EditorView) {
            this.entities = entityMatcher.createDeco(view);
        }

        update(update: ViewUpdate) {
            this.entities = entityMatcher.updateDeco(update, this.entities);
        }
    }, {
        decorations: instance => instance.entities,
        provide: plugin => EditorView.atomicRanges.of(view =>
            view.plugin(plugin)?.entities || Decoration.none),
    });

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
                entity: entity,
                label: entity.label,
                detail: entity.alternatives.join(", "),
                apply: JSON.stringify({id: entity.id, type: entity.type, label: entity.label}),
            })),
        };
    }

    function renderCompletionOptionIcon(completion: Completion) {
        if ('entity' in completion) {
            const typeRef = types[(completion.entity as MinimalEntity).type];
            const icon = typeRef.icon.cloneNode(true) as SVGElement;
            icon.classList = "cm-entity-icon";
            return icon;
        }

        return null;
    }

    const updateListener = EditorView.updateListener.of(update => {
        if (!update.docChanged && !update.transactions.some(tr => tr.effects.length)) {
            return;
        }

        const canUndo = undoDepth(update.state) > 0;
        const canRedo = redoDepth(update.state) > 0;

        onUpdate(canUndo, canRedo);
    });

    const view = new EditorView({
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
                ".cm-entity": {
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.2em",
                    borderRadius: "0.2em",
                    fontSize: "0.9em",
                    backgroundColor: "var(--cm-entity-color)",
                    color: "color-mix(in srgb, var(--cm-entity-color) 10%, black 90%);",
                },
                ".cm-entity-icon": {
                    marginRight: "0.2em",
                    width: "1em",
                    height: "1em",
                },
                ".cm-entity-cross": {
                    marginLeft: "0.2em",
                    width: "1em",
                    height: "1em",
                    cursor: "pointer",
                },
                ".cm-tooltip.cm-tooltip-autocomplete": {
                    "& > ul": {
                        fontFamily: "sans-serif",
                    }
                },
                ".cm-completionDetail": {
                    display: "block",
                    fontSize: "0.9em",
                    margin: "0",
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
                ...standardKeymap,
                ...historyKeymap
            ]),
            history(),
            autocompletion({
                icons: false,
                override: [entityCompletionSource],
                addToOptions: [{
                    render: renderCompletionOptionIcon,
                    position: 5
                }],
            }),
            entitiesPlugin,
            updateListener
        ]
    });

    return {
        search: () => onSearch(view.state.doc.toString()),
        undo: () => undo(view),
        redo: () => redo(view),
    };
}

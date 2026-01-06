import {standardKeymap} from "@codemirror/commands";
import {StateEffect, StateField, RangeSetBuilder} from "@codemirror/state";
import {Decoration, WidgetType, EditorView, keymap} from "@codemirror/view";
import {autocompletion, CompletionContext, CompletionResult} from "@codemirror/autocomplete";

interface Entity {
    id: string;
    type: string;
    _label: string;
    alternative_labels: string[];
}

interface EntityState {
    from: number;
    to: number;
    entity: Entity;
}

const insertEntity = StateEffect.define<EntityState>();

class EntityWidget extends WidgetType {
    constructor(private entity: Entity) {
        super();
    }

    eq(other: WidgetType) {
        return other instanceof EntityWidget && this.entity.id === other.entity.id;
    }

    toDOM() {
        const el = document.createElement("span");
        el.textContent = this.entity._label;
        el.style.cssText = `
            border-radius: 4px;
            padding: 2px 4px;
            background: #eef;`;
        return el;
    }
}

function buildEntityRanges(ents: readonly EntityState[]) {
    const builder = new RangeSetBuilder<Decoration>();
    for (const e of ents) {
        builder.add(e.from, e.to, Decoration.replace({
            widget: new EntityWidget(e.entity),
            inclusive: true
        }));
    }
    return builder.finish();
}

const entityField = StateField.define<readonly EntityState[]>({
    create() {
        return [];
    },

    update(entityStates, tr) {
        if (tr.docChanged) {
            entityStates = entityStates.map(e => ({
                ...e,
                from: tr.changes.mapPos(e.from),
                to: tr.changes.mapPos(e.to)
            })).filter(e => e.from < e.to);
        }

        for (const effect of tr.effects) {
            if (effect.is(insertEntity)) {
                entityStates = [...entityStates, effect.value];
            }
        }

        return entityStates;
    },

    provide(field) {
        return [
            EditorView.atomicRanges.of(view => buildEntityRanges(view.state.field(field))),
            EditorView.decorations.of(view => buildEntityRanges(view.state.field(field)))
        ];
    },
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
                const labelMatch = entity._label.toLowerCase().indexOf(search) > -1;
                const altMatch = entity.alternative_labels.find(alt => alt.toLowerCase().indexOf(search) > -1);

                return labelMatch || altMatch;
            }).map(entity => ({
                type: "property",
                label: entity._label,
                info: entity.alternative_labels.join(", "),
                apply(view, completion, from, to) {
                    view.dispatch({
                        changes: {from, to, insert: completion.label},
                        effects: insertEntity.of({
                            from,
                            to: from + completion.label.length,
                            entity
                        })
                    });
                },
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
            entityField
        ]
    });
}

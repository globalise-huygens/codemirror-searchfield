import createSearchField from "./searchfield";
import placeIcon from "./place.svg";
import polityIcon from "./polity.svg";
import places from "../data/places.json" with {type: "json"};
import polities from "../data/polities.json" with {type: "json"};

function getSVGElement(svg: string) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, "image/svg+xml");
    return svgDoc.documentElement as unknown as SVGElement;
}

const types = {
    'Place': {color: '#C5D89D', icon: getSVGElement(placeIcon)},
    'Polity': {color: '#BDE8F5', icon: getSVGElement(polityIcon)},
};

const entities = [...places.map(place => ({
    id: place.id,
    type: place.type,
    label: place._label,
    alternatives: place.alternative_labels
})), ...polities.map(polity => ({
    id: polity.id,
    type: polity.type,
    label: polity._label,
    alternatives: polity.alternative_labels
}))].sort((a, b) => a.label.localeCompare(b.label));

const input = document.getElementsByClassName("searchbox-input")[0];
const undoButton = document.getElementsByClassName("searchbox-undo-button")[0];
const redoButton = document.getElementsByClassName("searchbox-redo-button")[0];
const searchButton = document.getElementsByClassName("searchbox-search-button")[0];

function onSearch(query: string) {
    console.log("Search query:", query);
}

function onUpdate(canUndo: boolean, canRedo: boolean) {
    console.log("On update:", canUndo, canRedo);

    canUndo ? undoButton.removeAttribute("disabled") : undoButton.setAttribute("disabled", "disabled");
    canRedo ? redoButton.removeAttribute("disabled") : redoButton.setAttribute("disabled", "disabled");
}

const {search, undo, redo} = createSearchField({
    doc: "",
    parent: input,
    onSearch,
    onUpdate,
    types,
    entities
});

undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
searchButton.addEventListener("click", search);

// @ts-ignore
if (DEV) {
    new EventSource("/esbuild").addEventListener("change", () => location.reload());
}

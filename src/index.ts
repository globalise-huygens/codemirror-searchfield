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

const data = [...places.map(place => ({
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

const onSearch = (query: string) => console.log("Search query:", query);
const searchField = createSearchField("", document.getElementsByClassName("searchbox-input")[0], onSearch, types, data);

document
    .getElementsByClassName("searchbox-button")[0]
    .addEventListener("click", () => onSearch(searchField.state.doc.toString()));

// @ts-ignore
if (DEV) {
    new EventSource("/esbuild").addEventListener("change", () => location.reload());
}

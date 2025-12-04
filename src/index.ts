import createSearchField from "./searchfield";
import data from "./data.json" with {type: "json"};

const onSearch = (query: string) => console.log("Search query:", query);
const searchField = createSearchField("", document.getElementsByClassName("searchbox-input")[0], onSearch, data.map(d => ({
    id: d.id,
    type: d.type,
    preferred: d.labels.en.preferred,
    alternative: d.labels.en.alternative,
    hidden: d.labels.en.hidden
})));

document
    .getElementsByClassName("searchbox-button")[0]
    .addEventListener("click", () => onSearch(searchField.state.doc.toString()));

// @ts-ignore
if (DEV) {
    new EventSource("/esbuild").addEventListener("change", () => location.reload());
}

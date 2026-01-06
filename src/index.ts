import createSearchField from "./searchfield";
import places from "../data/places.json" with {type: "json"};
import polities from "../data/polities.json" with {type: "json"};

const data = [...places, ...polities];
const onSearch = (query: string) => console.log("Search query:", query);
const searchField = createSearchField("", document.getElementsByClassName("searchbox-input")[0], onSearch, data);

document
    .getElementsByClassName("searchbox-button")[0]
    .addEventListener("click", () => onSearch(searchField.state.doc.toString()));

// @ts-ignore
if (DEV) {
    new EventSource("/esbuild").addEventListener("change", () => location.reload());
}

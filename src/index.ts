import createSearchField from "./searchfield";

const onSearch = (query: string) => console.log("Search query:", query);
const searchField = createSearchField("", document.getElementsByClassName("searchbox-input")[0], onSearch);

document
    .getElementsByClassName("searchbox-button")[0]
    .addEventListener("click", () => onSearch(searchField.state.doc.toString()));

// @ts-ignore
if (DEV) {
    new EventSource("/esbuild").addEventListener("change", () => location.reload());
}

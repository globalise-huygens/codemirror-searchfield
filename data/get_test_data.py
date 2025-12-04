import os
import json


def get_places(folder_path):

    places = []
    for file in os.listdir(folder_path):
        if file.endswith(".json"):

            print(f"Processing file: {file}")

            with open(os.path.join(folder_path, file), "r") as f:
                data = json.load(f)

                if "@graph" in data and len(data["@graph"]) > 0:
                    data = data["@graph"][0]

                preferred_label = ""
                alternative_labels = []

                if data["is_appellative_subject_of"] is None:
                    continue

                if not isinstance(data["is_appellative_subject_of"], list):
                    data["is_appellative_subject_of"] = [
                        data["is_appellative_subject_of"]
                    ]

                for appellative_status in data["is_appellative_subject_of"]:

                    if type(appellative_status["classified_as"]) is str:
                        label_type = appellative_status["classified_as"]
                    elif type(appellative_status["classified_as"][0]) is str:
                        label_type = appellative_status["classified_as"][0]
                    else:
                        label_type = appellative_status["classified_as"][0].get("id")

                    label_value = appellative_status["ascribes_appellation"]["content"]

                    if label_type == "http://vocab.getty.edu/aat/300264273":
                        alternative_labels.append(label_value)
                    elif label_type == "http://vocab.getty.edu/aat/300404670":
                        preferred_label = label_value

                places.append(
                    {
                        "id": data.get("id"),
                        "type": data.get("type"),
                        "_label": preferred_label,
                        "alternative_labels": alternative_labels,
                    }
                )

    return places


def get_polities(file_path):

    polities = []
    with open(file_path) as f:
        data = json.load(f)

    for polity in data["@graph"]:
        preferred_label = ""
        alternative_labels = []

        if polity["is_appellative_subject_of"] is None:
            continue

        if not isinstance(polity["is_appellative_subject_of"], list):
            polity["is_appellative_subject_of"] = [polity["is_appellative_subject_of"]]

        for appellative_status in polity["is_appellative_subject_of"]:

            if type(appellative_status["classified_as"]) is str:
                label_type = appellative_status["classified_as"]
            elif type(appellative_status["classified_as"][0]) is str:
                label_type = appellative_status["classified_as"][0]
            else:
                label_type = appellative_status["classified_as"][0].get("id")

            label_value = appellative_status["ascribes_appellation"][0]["content"][
                "@value"
            ]

            if label_type in (
                "http://vocab.getty.edu/aat/300264273",
                "http://vocab.getty.edu/aat/300417226",
            ):
                if "|" in label_value:
                    for alt_label in label_value.split("|"):
                        alternative_labels.append(alt_label.strip())
                else:
                    alternative_labels.append(label_value)
            elif label_type == "http://vocab.getty.edu/aat/300404670":
                preferred_label = label_value

        polities.append(
            {
                "id": polity.get("id"),
                "type": polity.get("type"),
                "_label": preferred_label,
                "alternative_labels": alternative_labels,
            }
        )
    return polities


if __name__ == "__main__":

    # places/places-20251201.tgz
    places = get_places("places")

    with open("places.json", "w") as f:
        json.dump(places, f, indent=4)

    # polities/sample_framed.jsonld
    polities = get_polities("polities/sample_framed.jsonld")

    with open("polities.json", "w") as f:
        json.dump(polities, f, indent=4)

import { getNameById } from "./search";
import { writeFileSync, readFileSync } from "fs";
import { type EntryData, Completion } from "./types";
import { exit } from "process";

// Very simple naive search algorithm
export function searchList(name: string, path: string) {
	for (let anime of getList(path)) {
		if (anime.name.toLowerCase().includes(name.toLowerCase())) {
			console.log(anime);
			return;
		}
	}
	console.error(`[Error] Match not found for search term ${name}`);
}

export async function addNewAnime(id: number, path: string) {
	const list = getList(path);
	const index = list.findIndex((entry) => entry.mal_id === id);
	if (index !== -1) {
		console.error("[Error] Entry already in list");
		exit(1);
	}

	const name = await getNameById(id);
	const newEntry: EntryData[] = [
		{
			name,
			mal_id: id,
			completion: Completion.PlanToWatch,
			start_date: new Date().toISOString().split("T")[0],
		},
	];

	// Maybe prompt for confirmation if the name is N/A?
	console.log(`[Info] Added ${name} to list`);
	writeFileSync(path, JSON.stringify(merge(list, newEntry), null, 2));
}

export async function removeAnime(id: number, path: string) {
	const list = getList(path);
	const index = list.findIndex((entry) => entry.mal_id === id);
	if (index === -1) {
		console.error("[Error] id not found in list");
		exit(1);
	}
	list.splice(index, 1);

	const name = await getNameById(id);
	console.log(`[Info] Removed ${name} from list`);
	writeFileSync(path, JSON.stringify(list, null, 2));
}

export function getList(path: string): EntryData[] {
	try {
		const list = readFileSync(path).toString();
		return JSON.parse(list);
	} catch {
		writeFileSync(path, "[]");
		return getList(path);
	}
}

function compareDates(oldAnime: EntryData, newAnime: EntryData): boolean {
	if (
		oldAnime.start_date === "0000-00-00" ||
		newAnime.start_date === "0000-00-00"
	)
		return oldAnime.completion < newAnime.completion;

	const d1 = new Date(oldAnime.start_date);
	const d2 = new Date(newAnime.start_date);
	return d1 > d2;
}

export function merge(
	oldEntries: EntryData[],
	newEntries: EntryData[],
): EntryData[] {
	let combinedEntries: EntryData[] = oldEntries.concat(newEntries);

	for (let i = 0; i < combinedEntries.length; i++) {
		for (let j = 0; j < combinedEntries.length; j++) {
			if (
				combinedEntries[i].mal_id === combinedEntries[j].mal_id &&
				compareDates(combinedEntries[i], combinedEntries[j])
			) {
				combinedEntries.splice(j, 1);
			}
		}
	}

	return combinedEntries.toSorted((a, b) => a.mal_id - b.mal_id);
}

export function modifyCompletion(
	id: number,
	completion: Completion,
	path: string,
) {
	const list = getList(path);
	const index = list.findIndex((entry) => entry.mal_id === id);
	if (index === -1) {
		console.error("[Error] id not found in list");
		exit(1);
	}

	list[index].completion = completion;
	writeFileSync(path, JSON.stringify(list, null, 2));
}

export function modifyDate(id: number, date: string, path: string) {
	const list = getList(path);
	const index = list.findIndex((entry) => entry.mal_id === id);
	if (index === -1) {
		console.error("[Error] id not found in list");
		exit(1);
	}

	try {
		const newDate = new Date(date);
		list[index].start_date = newDate.toISOString().split("T")[0];
		writeFileSync(path, JSON.stringify(list, null, 2));
	} catch {
		console.error("[Error] Invalid date provided");
		exit(1);
	}
}

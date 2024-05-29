import { readFileSync, writeFileSync } from "fs";
import { XMLParser } from "fast-xml-parser";
import { getNameById, type SearchResult } from "./search";

enum Completion {
	Completed,
	Watching,
	Dropped,
	PlanToWatch,
	OnHold,
}

// All other data fetched by API requests by id
interface EntryData {
	name: string;
	mal_id: number;
	completion: Completion;
	start_date: string;
}

interface MalAnime {
	series_animedb_id: number;
	series_title: string;
	my_start_date: string;
	my_status: string;
}

interface MalFormat {
	myanimelist: {
		anime: MalAnime[];
	};
}

function parseMal(file: string): EntryData[] {
	console.log("[Info] Parsing XML");
	const contents = readFileSync(file);
	const json: MalFormat = new XMLParser().parse(contents);
	const animeList: MalAnime[] = json.myanimelist.anime;
	const newEntries: EntryData[] = [];
	for (let anime of animeList) {
		let malStatus = Completion.PlanToWatch;

		switch (anime.my_status) {
			case "Completed":
				malStatus = Completion.Completed;
				break;
			case "Plan To Watch":
				malStatus = Completion.PlanToWatch;
				break;
			case "On-Hold":
				malStatus = Completion.OnHold;
				break;
			case "Dropped":
				malStatus = Completion.Dropped;
				break;
			case "Watching":
				malStatus = Completion.Watching;
				break;
		}

		newEntries.push({
			name: anime.series_title,
			mal_id: anime.series_animedb_id,
			start_date: anime.my_start_date,
			completion: malStatus,
		});
	}
	return newEntries;
}

// JSON format is temporary, it's just easy to work with
export function importMal(file: string) {
	console.log("[Info] Writing to JSON");
	const entries = parseMal(file);
	writeFileSync("anime.json", JSON.stringify(entries, null, 2));
	console.log("[Info] Complete");
}

// Kitsu format is identical to MAL but w/ no name, so we have to fetch it manually
async function parseKitsu(file: string): Promise<EntryData[]> {
	console.log("[Info] Parsing XML");
	const contents = readFileSync(file);
	const json: MalFormat = new XMLParser().parse(contents);
	const animeList: MalAnime[] = json.myanimelist.anime;
	const newEntries: EntryData[] = [];
	for (let anime of animeList) {
		let malStatus = Completion.PlanToWatch;

		// Tiny tiny discrepancies in the formatting of labels >:(
		switch (anime.my_status) {
			case "Completed":
				malStatus = Completion.Completed;
				break;
			case "Plan to Watch":
				malStatus = Completion.PlanToWatch;
				break;
			case "On Hold":
				malStatus = Completion.OnHold;
				break;
			case "Dropped":
				malStatus = Completion.Dropped;
				break;
			case "Watching":
				malStatus = Completion.Watching;
				break;
		}

		// We r really gonna have to make a network request for each title... wow...
		// Now i have to color all my functions >:(
		newEntries.push({
			name: await getNameById(anime.series_animedb_id),
			mal_id: anime.series_animedb_id,
			start_date: anime.my_start_date,
			completion: malStatus,
		});
	}
	return newEntries;
}

// Merge this into other function because it's nearly indentical
export async function importKitsu(file: string) {
	console.log("[Info] Writing to JSON");
	const entries = await parseKitsu(file);
	writeFileSync("anime.json", JSON.stringify(entries, null, 2));
	console.log("[Info] Complete");
}
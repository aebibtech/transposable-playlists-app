
export interface RadioStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  country: string;
}

export async function searchRadio(query: string): Promise<RadioStation[]> {
  const url = `https://at1.api.radio-browser.info/json/stations/search?name=${encodeURIComponent(query)}&limit=10&order=clickcount&reverse=true`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

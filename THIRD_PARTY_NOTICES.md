# Third-party notices and data terms

This file records third-party software, services, data and map layers used by the project. It is not a licence for the project's own source code. The repository currently publishes no open-source licence; public visibility alone does not grant permission to copy, modify or redistribute the project code.

## Leaflet

- Component: Leaflet 1.9.4
- Project: <https://leafletjs.com/>
- Licence: BSD 2-Clause

```text
BSD 2-Clause License

Copyright (c) 2010-2023, Volodymyr Agafonkin
Copyright (c) 2010-2011, CloudMade
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## Open-Meteo

- Service: forecast API used for current grid estimates and forecast time steps
- Website: <https://open-meteo.com/>
- Terms: <https://open-meteo.com/en/terms>
- Pricing and attribution: <https://open-meteo.com/en/pricing>

The public free endpoint is for non-commercial use, has no uptime guarantee and is subject to the provider's limits. Open-Meteo states that attribution is required under CC BY 4.0. The application must identify Open-Meteo as the source wherever its grid values are presented. Commercial or promotional deployment requires a separately appropriate Open-Meteo plan or another licensed source.

Open-Meteo values displayed beside a reference station are model/grid values near the station, not raw readings from that physical station.

## OpenStreetMap, Photon and Nominatim

- OpenStreetMap copyright and licence: <https://www.openstreetmap.org/copyright>
- Photon public service and project: <https://photon.komoot.io/> and <https://github.com/komoot/photon>
- Nominatim public API policy: <https://operations.osmfoundation.org/policies/nominatim/>

OpenStreetMap attribution must remain visible on the map. Runtime online search currently uses the public Photon service; some local popular-place coordinates were previously checked using Nominatim. Public community geocoders are best-effort services, not production SLAs. Before meaningful public traffic, the project must confirm the selected service's current policy and capacity, keep a compliant cache, self-host Photon, or use a provider intended for production use. The current local popular-place index and coordinate/map selection remain independent fallbacks.

## CARTO basemap

- Basemap provider: CARTO
- Legal terms: <https://carto.com/legal/>

The rendered map includes attribution to both OpenStreetMap contributors and CARTO. Continued use is subject to the provider's current basemap and service terms.

## Alibaba Cloud DataV administrative boundary

- Layer endpoint: <https://geo.datav.aliyun.com/areas_v3/bound/110000_full.json>

The Beijing administrative boundary is loaded as a best-effort visual fallback. No ownership transfer or independent redistribution right is claimed. Availability and reuse terms must be reconfirmed before commercial use or repackaging.

## Beijing municipal reference-station data

- Source: Beijing local standard DB11/T 1643—2023
- Document URL: <https://bzh.scjgj.beijing.gov.cn/bzh/apifile/file/2024/20240205/d128a78b-0787-48da-8e7b-384ad60a43a5.pdf>

The project transcribes 18 reference-station identifiers, coordinates and elevations from the public standard. They are a reference subset, not a complete inventory of Beijing automatic weather stations.

## Beijing Water Authority rain context

- Public page: <https://nsbd.swj.beijing.gov.cn/csyq1.html>

The application links to the official page but does not call, cache or republish the undocumented rain-context data endpoint. Explicit permission or a licensed replacement is required before adding those data to a public or commercial build.

## No warranty from third parties

Third-party names are used only to identify sources. Their appearance does not imply endorsement. Availability, accuracy, licensing and interface stability are controlled by the respective providers and may change independently of this project.

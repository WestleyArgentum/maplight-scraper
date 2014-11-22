
## MapLight Scraper

[MapLight](http://maplight.org/) presents an enourmous amount of interesting data on their website, and these tools can help you get access to it. Also check out [MapLight.jl](https://github.com/WestleyArgentum/MapLight.jl) if you're interested in using their API.


### Getting Started

#### Bulk Data
Inside `./maplight-data` you'll find bulk data files that detail industry positions on different versions of bills. This data will be the basis for our further work.

#### Scraper
This repo is set up to be a node package for scraping maplight. There are two main datasets it can pull down, bill "descriptions" (information about which chamber a bill was in, what actions were taken on it, etc) and "contributions" (information about contributions from interest groups invested in the vote).

To run the scraper:
- `cd maplight-scraper`
- `npm install`
- `node scraper.js "./maplight-data/<bulk data file>" ["descriptions" | "contributions"]`

#### Munger
This repo also comes with a `munger.jl` script that will combine all the scraped descriptions and output a more consumable json dictionary with properties:

- `actionId`
- `session`
- `prefix`
- `num`
- `congress`
- `action`
- `passed`
- `dateIntroduced`
- `dateVote`
- `positions`

To run the munger, open a Julia REPL and run:
- `julia> require("munger.jl")`
- `julia> run_all("./maplight-data/<bulk data file>", "<dir containing scraped bill data>", "<output bill data>", "<output industry list>")`

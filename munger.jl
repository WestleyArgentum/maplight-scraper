
using JSON
using DataFrames


function load_bulk_data(maplight_bulk_file)
    readtable(maplight_bulk_file)
end

function join_bill_data(positions, description_folder)
    bills = Dict()

    descriptions = readdir(description_folder)
    for desc in descriptions
        data = JSON.parse(readall(joinpath(description_folder, desc)))
        bills[data["actionId"]] = data
    end

    println(bills)

    println("------------------")

    for (aid, data) in positions
        println(aid)

        bills[string(aid)]["positions"] = data
    end

    bills
end

function build_industry_table(bulk_table)
    { r[:Catcode] => r[:Industry] for r in eachrow(bulk_table) }
end

function build_position_map(bulk_table)
    positions = Dict()

    for r in eachrow(bulk_table)
        positions_on_action = get!(positions, r[:ActionID], {
            "support" => String[],
            "oppose" => String[],
            "split" => String[] })

        likeminded_groups = positions_on_action[lowercase(r[:InterestGroupSupport])]

        push!(likeminded_groups, r[:Catcode])
    end

    positions
end

# Run this function to build all the tables, munge everthing, and save out the results
function run_all(maplight_bulk_file, description_folder, output_bills_filename, output_industries_filename)
    bulk_table = load_bulk_data(maplight_bulk_file)

    industry_table = build_industry_table(bulk_table)
    position_map = build_position_map(bulk_table)
    bill_data = join_bill_data(position_map, description_folder)

    # save industry data
    out = open(output_industries_filename, "w")
    write(out, json(industry_table))
    close(out)

    # save bill data
    out = open(output_bills_filename, "w")
    write(out, json(bill_data))
    close(out)
end

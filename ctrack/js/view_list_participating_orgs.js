// Copyright (c) 2014 International Aid Transparency Initiative (IATI)
// Licensed under the MIT license whose full text can be found at http://opensource.org/licenses/MIT

const view_list_participating_orgs={}
export default view_list_participating_orgs
view_list_participating_orgs.name="view_list_participating_orgs"

import ctrack     from "./ctrack.js"
import plate      from "./plate.js"
import iati       from "./iati.js"
import fetcher    from "./fetcher.js"
import csvw       from "./csvw.js"
import refry      from "../../dstore/js/refry.js"
import iati_codes from "../../dstore/json/iati_codes.json"
import crs        from "../../dstore/json/crs.js"

let crs_year=crs.donors

var commafy=function(s) { return (""+s).replace(/(^|[^\w.])(\d{4,})/g, function($0, $1, $2) {
		return $1 + $2.replace(/\d(?=(?:\d\d\d)+(?!\d))/g, "$&,"); }) };

// the chunk names this view will fill with new data
view_list_participating_orgs.chunks=[
	"list_participating_orgs_datas",
	"list_participating_orgs_count",
];

//
// display the view
//
view_list_participating_orgs.view=function()
{
	view_list_participating_orgs.chunks.forEach(function(n){ctrack.chunk(n,"{spinner_in_table_row}");});
	ctrack.setcrumb(1);
	ctrack.change_hash();
	view_list_participating_orgs.ajax({q:ctrack.hash});
};

//
// Perform ajax call to get data
//
view_list_participating_orgs.ajax=function(args)
{
	args=args || {};
	args.zerodata=args.zerodata||"{alert_no_data1}";

	var dat={
			"from":"act",
			"limit":args.limit || -1,
			"select":"count_aid,reporting_ref,any_reporting",
			"groupby":"reporting_ref",
			"orderby":"1-",
		};
		
	fetcher.ajax_dat_fix(dat,args);

	let postesc=function(s)
	{
		let r=(s||"").split("'").join("''")
		let a=r.split("\\")
		if( a.length>1 ) { return " E'"+a.join("\\\\")+"'" }
		return "'"+r+"'"
	}
	
	dat.reporting_ref=dat["/participating-org@ref"]||dat.reporting_ref
	
	if(!dat.reporting_ref)
	{
		return args.callback() // invalid
	}

	dat.sql=`

SELECT

xson->>'@ref' AS "ref" ,
xson->'/narrative' AS "narrative" ,
pid as "pid",
array_agg(DISTINCT xson->>'@role') AS "role" ,
array_agg(DISTINCT xson->>'@type') AS "type" ,
count(*) AS count ,
count(DISTINCT pid) AS count_pid ,
count(DISTINCT aid) AS count_aid

FROM xson WHERE root='/iati-activities/iati-activity/participating-org' 
AND xson->>'@ref'=${postesc(dat.reporting_ref)}

GROUP BY 1,2,3
ORDER BY 8 DESC

`


	if(args.output=="count") // just count please
{
	dat.sql=`

SELECT

xson->>'@ref' AS "ref" ,
xson->'/narrative' AS "narrative" ,
count(DISTINCT pid) AS count_pid ,
count(DISTINCT aid) AS count_aid

FROM xson WHERE root='/iati-activities/iati-activity/participating-org' 
AND xson->>'@ref'=${postesc(dat.reporting_ref)}

GROUP BY 1,2
ORDER BY 4 DESC

`
}
		
	fetcher.ajax(dat,function(data){

		var s=[];
		ctrack.args.chunks["table_header_amount"]=undefined;
		if((data.rows.length==0)&&(args.zerodata))
		{
			s.push( plate.replace(args.zerodata,{}) );
			ctrack.args.chunks["table_header_amount"]="";
		}
		var csvrows=[];
		csvrows[0]=["narrative","reporting-org","link"];
		var a=[];
		ctrack.chunk("list_participating_orgs_count",data.rows.length);
		for(var i=0;i<data.rows.length;i++)
		{
			var v=data.rows[i];

			var d={};
			d.num=i+1;

			d.text=""
			for(let n of v["narrative"]||[] )
			{
				d.text+=plate.replace("{list_participating_orgs_data_text}",{
					text:n[""]||"",
					lang:n["@xml:lang"]||"",
				});
				d.text_search="#view=list_activities&/participating-org@ref="+encodeURIComponent(dat.reporting_ref)
					+"&/participating-org/narrative="+encodeURIComponent(n[""])
				if(v["pid"])
				{
					d.text_search+="&reporting_ref="+encodeURIComponent(v["pid"])

					csvrows[csvrows.length]=[ n[""]||"", v.pid, ctrack.origin+"/ctrack.html?"+d.text_search ];
				}
				else
				{
					csvrows[csvrows.length]=[ n[""]||"", "", ctrack.origin+"/ctrack.html?"+d.text_search ];
				}
			}

			d.pid=v["pid"]||""
			d.pid_name=iati_codes.publisher_names[d.pid||""]||""

			d.role=""
			for(let n of v["role"]||[] )
			{
				d.role+=plate.replace("{list_participating_orgs_data_role}",{
					role:n||"",
					role_name:iati_codes.org_role[n||""]||"",
				});
			}

			d.type=""
			for(let n of v["type"]||[] )
			{
				d.type+=plate.replace("{list_participating_orgs_data_type}",{
					type:n||"",
					type_name:iati_codes.org_type[n||""]||"",
				});
			}


			d.count_aid=v.count_aid
			d.count_pid=v.count_pid

			a.push(d);

			if(args.output=="count") // just count please
			{
				s.push( plate.replace(args.plate || "{list_participating_orgs_count_data}",d) );
			}
			else
			{
				s.push( plate.replace(args.plate || "{list_participating_orgs_data}",d) );
			}

		}

		ctrack.chunk(args.chunk || "list_participating_orgs_datas",s.join(""));
		ctrack.chunk((args.chunk || "list_participating_orgs_datas")+"_csv","data:text/csv;charset=UTF-8,"+ctrack.encodeURIComponent(csvw.arrayToCSV(csvrows)));

		if(args.callback){args.callback(data);}
		ctrack.display();
	});
}

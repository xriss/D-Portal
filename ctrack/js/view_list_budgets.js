// Copyright (c) 2014 International Aid Transparency Initiative (IATI)
// Licensed under the MIT license whose full text can be found at http://opensource.org/licenses/MIT



const view_list_budgets={}
export default view_list_budgets
view_list_budgets.name="view_list_budgets"

import ctrack     from "./ctrack.js"
import plate      from "./plate.js"
import iati       from "./iati.js"
import fetcher    from "./fetcher.js"
import csvw       from "./csvw.js"
import views      from "./views.js"
import refry      from "../../dstore/js/refry.js"
import iati_codes from "../../dstore/json/iati_codes.json"
import crs        from "../../dstore/json/crs.js"

let crs_year=crs.donors


var commafy=function(s) { return (""+s).replace(/(^|[^\w.])(\d{4,})/g, function($0, $1, $2) {
		return $1 + $2.replace(/\d(?=(?:\d\d\d)+(?!\d))/g, "$&,"); }) };

function html_encode(value){ return $('<div/>').text(value).html(); }

// the chunk names this view will fill with new data
view_list_budgets.chunks=[
	"list_budgets_datas",
	"list_budgets_count",
];

//
// display the view
//
view_list_budgets.view=function()
{
	view_list_budgets.chunks.forEach(function(n){ctrack.chunk(n,"{spinner_in_table_row}");});
	ctrack.setcrumb(1);
	ctrack.change_hash();
	view_list_budgets.ajax({year:ctrack.hash.year,funder:ctrack.hash.funder});
};

//
// Perform ajax call to get data
//
view_list_budgets.ajax=function(args)
{
	args=args || {};
	args.zerodata=args.zerodata||"{alert_no_data1}";

	var dat={
			"from":"act,budget",
			"limit":args.limit || -1,
			"select":ctrack.convert_str("sum_of_percent_of_budget")+",aid,funder_ref,title,reporting,reporting_ref",
			"groupby":"aid",
			"orderby":"1-",
			"budget_priority":1, // has passed some validation checks serverside
		};
	
	var year=dat.year || ctrack.hash.year;
	if(year)
	{
		dat["budget_day_start_gteq"]=(parseInt(year)+0)+"-"+ctrack.args.newyear;
		dat["budget_day_start_lt"]=(parseInt(year)+1)+"-"+ctrack.args.newyear;
	}
	fetcher.ajax_dat_fix(dat,args,"budget");

	if(args.output=="count") // just count please
	{
		dat.select="count";
		delete dat.limit;
		delete dat.orderby;
		delete dat.groupby;
	}
	fetcher.ajax(dat,function(data){
		if(args.output=="count")
		{
			ctrack.chunk(args.chunk || "list_budgets_count",commafy(data.rows[0]["count"]));
			view_stats.calc();
		}
		else
		{
			var s=[];
			var total=0;
			ctrack.args.chunks["table_header_amount"]=undefined;
			if((data.rows.length==0)&&(args.zerodata))
			{
				s.push( plate.replace(args.zerodata,{}) );
				ctrack.args.chunks["table_header_amount"]="";
			}
			ctrack.chunk("list_budgets_count",data.rows.length);
			var a=[];
			for(var i=0;i<data.rows.length;i++)
			{
				var v=data.rows[i];
				var d={};
				d.num=i+1;
				d.funder_ref=v.funder_ref;
				d.aid=ctrack.encodeURIComponent(v.aid);
				d.title=html_encode(v.title || v.aid || "N/A");
				d.reporting=iati_codes.publisher_names[v.reporting_ref] || v.reporting || v.reporting_ref;
				total+=ctrack.convert_num("sum_of_percent_of_budget",v);
				d.amount_num=Math.floor(ctrack.convert_num("sum_of_percent_of_budget",v));
				d.amount=commafy(""+d.amount_num);
				d.currency=ctrack.display_usd;
				a.push(d);
				s.push( plate.replace(args.plate || "{list_budgets_data}",d) );
			}
			ctrack.chunk(args.chunk || "list_budgets_datas",s.join(""));
			ctrack.chunk("total",commafy(""+Math.floor(total)));

			var p=function(s)
			{
				s=s || "";
				s=s.replace(/[,]/g,"");
				return parseInt(s);
			}
			var cc=[];
			cc[0]=["iati-identifier","title","reporting-org","total-budget","currency","link"];
			a.forEach(function(v){
				cc[cc.length]=[decodeURIComponent(v.aid),v.title,v.reporting,v.amount_num,v.currency,ctrack.origin+"/ctrack.html#view=act&aid="+v.aid];
			});
			ctrack.chunk((args.chunk || "list_budgets_datas")+"_csv","data:text/csv;charset=UTF-8,"+ctrack.encodeURIComponent(csvw.arrayToCSV(cc)));

		}
		if(args.callback){args.callback(data);}
		ctrack.display();
	});
}

<template>
<div>
    <div class="grd contain" v-if="config">
        <div class="grd-row">
            <div class="grd-row-col-3-6">
                <div class="summary">
                    <div>Exchange:</div> 
                    <div>{{config.watch.exchange}}</div>
                    <div>Coin:</div>
                    <div>{{config.watch.asset}} - {{config.watch.currency}}</div>
                    <div>Time: </div>
                    <div>{{ humanizeLocal(config.backtest.daterange.from)}} - {{humanizeEndtime(config.backtest.daterange.to)}}</div>
                </div>
            </div>
            <div class="grd-row-col-3-6">
                <div class="summary">
                    <div>Method</div> 
                    <div>{{config.tradingAdvisor.method}}</div>
                    <div>Candle size:</div> 
                    <div>{{config.tradingAdvisor.candleSize}}</div>
                    <div>History size:</div> 
                    <div>{{config.tradingAdvisor.historySize}}</div>
                </div>
            </div>            
        </div>
        <p>
        <div class="grd-row">
            <div class="grd-row-col-3-6">
                <div class="summary">
                    <div><strong>Market</strong></div> 
                    <div></div>
                    <div>Start price:</div> 
                    <div>{{round(report.startPrice)}}</div>
                    <div>End price:</div>
                    <div>{{ round(report.endPrice) }}</div>        
                    <div>Profit: </div> 
                    <div>{{round(report.market / 100 * report.startPrice)}}  ({{ round(report.market) }}%)</div>        
                </div>    
            </div>
            <div class="grd-row-col-3-6">
                <div class="summary">
                    <div><strong>Profit report</strong></div> 
                    <div></div>
                    <div>Start balance:</div> 
                    <div>{{ round(report.startBalance) }}</div>
                    <div>End balance:</div>
                    <div>{{ round(report.balance) }} </div>
                    <div>Profit</div>
                    <div>{{round(report.balance - report.startBalance)}} ({{ round(report.relativeProfit) }} %)</div>
                </div>    
            </div>
        </div>
        <p>
        <div class="grd-row">
           <div class="grd-row-col-3-6">
                <div class="summary">
                    <div><strong>Trades</strong></div>
                    <div></div>
                        <div>total amount:</div>
                        <div>{{ roundtrips.length }}</div>
                        <div>trades per month:</div>
                        <div>{{ round(roundtrips.length / 12)}}</div>
                        <div>win trades:</div>
                        <div>{{roundtrips.filter((r=> +r.pnl > 0)).length}}</div>
                        <div>loose trades:</div>
                        <div>{{roundtrips.filter((r=> +r.pnl < 0)).length}}</div>
                        <div>Sum fees: </div> 
                        <div>{{round( roundtrips.length* 0.0025 * 2 * report.startBalance )}} </div>        
                    </div>           
           </div>
           <div class="grd-row-col-3-6">
                <div class="summary">
                    <div><strong>Key figures</strong></div>
                    <div></div>
                        <div>sharpe ratio:</div>
                        <div>3.21</div>
                        <div>best win:</div>
                        <div>{{ round(maxProfit(roundtrips)) }} %</div>
                        <div>worst loose:</div>
                        <div>{{ round(report.downside) }} %</div> 
                        <div>avarage profit:</div>
                        <div>{{ round(avarageProfit(report.relativeProfit, roundtrips))}} %</div>                        
                        <div>avarage holding:</div>
                        <div>{{round(avarageDuration(report.exposure, config.backtest.daterange.from, config.backtest.daterange.to, roundtrips))}} days</div>                         
                    </div>           
           </div>
        </div>        
    </div>
</div>    

</template>

<script>
  import moment from 'moment';

  export default {
    name: 'performanceSummary',
    props: ['report', 'config', 'roundtrips', 'trades'],
    data: () => {
       return {
      }
    },
    components: {
    },
    methods: {
        round: n => (+n).toFixed(2),
        maxProfit: roundtrips => Math.max(...roundtrips.map(r => +r.pnl/+r.entryBalance )) * 100,
        avarageProfit: (profit, roundtrips) => profit / roundtrips.length, 
        avarageDuration: (exposure, start, end, roundtrips) =>  exposure * moment.duration(moment.utc(end).diff(moment.utc(start))).asDays() / roundtrips.length,
        humanizeLocal: date => moment.utc(date).format('DD.MM.YYYY'),
        humanizeEndtime: date => moment.utc(date).subtract(1, "days").format('DD.MM.YYYY')
    },

    mounted: function() {
        console.log(this.report);
    }
  }
</script>

<style>
div.summary{
    width:360px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
}

.price.profit {
    color: #28a745;
}
</style>
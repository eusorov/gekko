<template>
<div>
    <div class="">
        <span class="badge badge-success">buy</span>
    </div>
    <div class="currentsignal">
        <div class="date">
            <div>2020-10-10</div>
            <div class="small">15:06</div>
        </div>
        <div class="pair">
            <div>ETH - EUR</div>
            <div class="small">Kraken</div>
        </div>        
        <div class="price">
            <div>at: 188.02 €</div>
        </div>                
        <div class="profit">
            <div class="badge badge-success">14.10 %</div>
            <div class="small">Age: 15 days</div>
        </div>                        
    </div>

  <article class=" ">
    <h2 class="" itemprop="headline">ETH/EUR signal on KRAKEN</a></h2>

	<div class="">
        Signal at <strong>06 May 10:37 UTC</strong>
    <br>
    <br>Exchange: <strong>KRAKEN</strong>
    <br>Coin name: <strong>ETH</strong> / <strong>EUR</strong> – <a href="">Chart</a>
    <br>Buy: <strong>188.02</strong>
    <br>Current ask: <strong>188.01</strong>

    <br></p><p><strong>IMPORTANT:</strong> The information in this signal is meant for educational purposes only. Please, do not consider it as financial advice. There is no guarantee about the signal information or any results you may get by trading with it.</p>						</div><!-- .entry-content -->
    </article>
</div>    

</template>

<script>
  export default {
    name: 'currentsignal',
    data: () => {
       return {
       backtest: null  
      }
    },
    components: {
    },
  }
</script>

<style>
div.currentsignal{
    max-width:500px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
}
.badge {
    display: inline-block;
    padding: .25em .4em;
    font-size: 100%;
    font-weight: 700;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
    vertical-align: baseline;
    border-radius: .25rem;
    transition: color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out,box-shadow .15s ease-in-out;
}
.badge-success {
    color: #fff;
    background-color: #28a745;
}
.price.profit {
    color: #28a745;
}
</style>
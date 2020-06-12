<template>
<div>
  <div class="grd">Balance History</div>
  <svg id="chart" width='100%' height='500px'/>
</div>
</template>

<script>

import chart from '../../d3/d3-linechart'

export default {
  props: ['roundtrips', 'config'],

  data: function() {
    return {
    }
  },

 mounted: function() {   chart(this.roundtrips, this.config);  },

  
 methods: {
   
    render: function() {
      this.remove();
      chart();
    },
    remove: function() {
      d3.select('#chart').html('');
    }
  }
}
</script>

<style>

#chart {
  background-color: #fff;
}

div.tooltip {	
    position: absolute;			 
    text-align: center;			
    width: 100px;					
    height: 30px;					
    line-height: 30px;
    padding: 2px;				
    font: 12px sans-serif;		
    background: lightsteelblue;	
    border: 0px;		
    border-radius: 8px;			
    pointer-events: none;	
    display: flex;		
}

div.tooltip span {
  margin: auto; 
}

</style>

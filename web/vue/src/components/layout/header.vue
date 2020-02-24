<template lang='pug'>
  div
    #top
    header.bg--off-white.grd
      .contain.grd-row
        h3.py1.px2.col-2 Gekko UI
    nav.bg--light-gray
      .menu.contain
        router-link(to='/home').py1 Home
        router-link(to='/live-gekkos').py1 Live Gekkos
        router-link(to='/backtest').py1 Backtest
        router-link(to='/data').py1 Local data
        router-link(to='/config').py1 Config
        router-link(to='/login' v-if="!isLoggedIn").py1 Login
        a(v-on:click="logout" v-if="isLoggedIn").py1 Logout

</template>

<script>
import firebase from 'firebase';

export default {
 name: 'dashboard',
 computed : {
      isLoggedIn : function(){ return this.$store.getters.isLoggedIn}
 },  
 methods: {
    logout: function() {
      console.log("logout");
      firebase.auth().signOut().then(() => {
        this.$store.dispatch('logout').then(() => {
          this.$router.push('/login')
        })
      })
    }
  }
}
</script>

<style>
.menu {
  display: flex;
  flex-direction: row;
  margin-top: 0;
  margin-bottom: 2rem;
}

.menu a {
  flex: 1 1 100%;
  display: block;
  text-align: center;
  text-decoration: none;
  color: inherit;
}

.menu .router-link-active {
  background-color: rgba(250,250,250,.99);
}

.menu a:hover {
  text-decoration: underline;
}

</style>

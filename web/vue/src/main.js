import Vue from 'vue'
import firebase from 'firebase';

import App from './App.vue'

import VueRouter from 'vue-router'
Vue.use(VueRouter);

import store from './store'

import backtester from './components/backtester/backtester.vue'
import home from './components/layout/home.vue'

import data from './components/data/data.vue'
import importer from './components/data/import/importer.vue'
import singleImport from './components/data/import/single.vue'
import config from './components/config/config.vue'

import gekkoList from './components/gekko/list.vue'
import newGekko from './components/gekko/new.vue'
import singleGekko from './components/gekko/singleGekko.vue'
import { connect as connectWS } from './components/global/ws'

import Login from './components/Login';
import SignUp from './components/SignUp';


const router = new VueRouter({
  mode: 'hash',
  base: __dirname,
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/home', component: home },
    { path: '/backtest', component: backtester , meta: {  requiresAuth: true   } },
    { path: '/config', component: config, meta: {  requiresAuth: true   }  },
    { path: '/data', component: data, meta: {  requiresAuth: true   }  },
    { path: '/data/importer', component: importer, meta: {  requiresAuth: true   }  },
    { path: '/data/importer/import/:id', component: singleImport, meta: {  requiresAuth: true   }  },
    { path: '/live-gekkos', component: gekkoList, meta: {  requiresAuth: true   }  },
    { path: '/live-gekkos/new', component: newGekko, meta: {  requiresAuth: true   }  },
    { path: '/live-gekkos/:id', component: singleGekko, meta: {  requiresAuth: true   }  },

    { path: '/login', name: 'Login',  component: Login   },
    { path: '/sign-up', name: 'SignUp',  component: SignUp  },
  ]
});

const firebaseConfig = {
  apiKey: process.env.VUE_APP_APIKEY,
  authDomain: process.env.VUE_APP_AUTHDOMAIN,
  databaseURL: process.env.VUE_APP_DATABASEURL,
  projectId: process.env.VUE_APP_PROJECTID,
  storageBucket: process.env.VUE_APP_STORAGEBUCKET,
  messagingSenderId: process.env.VUE_APP_MESSAGINGSENDERID,
  appId: process.env.VUE_APP_APPID
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

router.beforeEach((to, from, next) => {
  const currentUser = firebase.auth().currentUser;
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (requiresAuth && !currentUser) next('login');
  else if (!requiresAuth && currentUser) next();
  else next();
});

// setup some stuff
connectWS();

new Vue({
  router,
  store,
  el: '#app',
  render: h => h(App)
})
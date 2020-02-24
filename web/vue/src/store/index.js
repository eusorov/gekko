import Vue from 'vue'
import Vuex from 'vuex'
import _ from 'lodash'

import * as importMutations from './modules/imports/mutations'
import * as gekkoMutations from './modules/gekkos/mutations'
import * as notificationMutations from './modules/notifications/mutations'
import * as configMutations from './modules/config/mutations'
import * as authMutations from './modules/authentification/mutations'

Vue.use(Vuex);

const debug = process.env.NODE_ENV !== 'production'

let mutations = {};

_.merge(mutations, importMutations);
_.merge(mutations, gekkoMutations);
_.merge(mutations, notificationMutations);
_.merge(mutations, configMutations);
_.merge(mutations, authMutations);

export default new Vuex.Store({
  state: {
    warnings: {
      connected: true, // assume we will connect
    },
    imports: [],
    gekkos: {},
    archivedGekkos: {},
    connection: {
      disconnected: false,
      reconnected: false
    },
    apiKeys: [],
    exchanges: {},
    token: localStorage.getItem('token') || '',
    user : undefined
  },
  mutations,
  strict: debug,
  actions: {
    login({commit}, user){
      return new Promise((resolve, reject) => {
        let token = "ABC";
        localStorage.setItem('token', token)
        commit('auth_success', user)
        resolve();
      })
    },
    logout({commit}){
      return new Promise((resolve, reject) => {
        commit('logout')
        localStorage.removeItem('token')
        resolve()
      })
    }
  },
  getters : {
    isLoggedIn: state => !!state.user,
  }
})
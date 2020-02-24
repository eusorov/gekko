import Vue from 'vue'

export const auth_success = (state, user) => {
  state.user = user;
  return state;
}

export const logout = (state) => {
  state.user = undefined;
  return state;
}
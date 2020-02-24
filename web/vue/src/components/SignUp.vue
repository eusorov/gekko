<template>
  <div class="contain">
  <div class="center">
  <div class="" >
    <h2>Sign Up</h2>
    <input type="text" v-model="email" placeholder="Email">
    <input type="password" v-model="password" placeholder="Password"><br>
    <a class="btn--primary" @click="signUp">Sign Up</a>
    <span>or go back to <router-link to="/login">login</router-link>.</span>
  </div>
  </div>
  </div>
</template>

 <script>
  import firebase from 'firebase';

  export default {
    name: 'signUp',
    data() {
      return {
        email: '',
        password: ''
      }
    },
    methods: {
      signUp: function() {
        firebase.auth().createUserWithEmailAndPassword(this.email, this.password).then(
          (user) => {
            this.$router.replace('home')
          },
          (err) => {
            alert('Oops. ' + err.message)
          }
        );
      }
    }
  }
</script>

 <style scoped>
  .sign-up {
    margin-top: 40px;
  }
  input {
    margin: 10px 0;
    padding: 15px;
  }
  button {
    margin-top: 10px;
    cursor: pointer;
  }
  span {
    display: block;
    margin-top: 20px;
    font-size: 11px;
  }
  .center{
    margin-left: auto; margin-right: auto; max-width:200px;
  }
</style>
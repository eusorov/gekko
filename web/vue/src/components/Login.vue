<template lang='pug'>
  .contain
    .center
      h2 Login
      form(autocomplete="on")
        input(v-model="email", placeholder="Email", type="text", autocomplete="username")  
        input(v-model="password", placeholder="Password", type="password", autocomplete="current-password")  
        br
        a.btn--primary(v-on:click="login") Connection
</template>

<!--  disable for now signup  
      p.text or Sign In with Google
        a.social-button(v-on:click="socialLogin")
          img(alt="Google Logo" src='static/google-logo.png')
      p.text You don't have an account ? You can 
        router-link(to='/sign-up') create one
        --> 
<script>


  import firebase from 'firebase';

  export default {
    name: 'login',
    data() {
      return {
        email: '',
        password: ''
      }
    },
    mounted() {
        let self = this
    },
    methods: {
      login: function() {
         this.$router.replace('home') //test succesfull
        firebase.auth().signInWithEmailAndPassword(this.email, this.password).then(
          (userObj) => {
            const user = {
              displayName : userObj.displayName,
              email : userObj.email
            } 

            this.$store.dispatch('login', user)
            .then(() => this.$router.push('/home'))
            .catch(err => console.log(err));
          },
          (err) => {
            alert('Oops. ' + err.message)
          }
        );
      },
      socialLogin() {
        console.log("social login") 
        const provider = new firebase.auth.GoogleAuthProvider();

        firebase.auth().signInWithPopup(provider).then((result) => {
           var token = result.credential.accessToken;
           const user = {
              displayName: result.user.displayName,
              email : result.user.email
           } 

          this.$store.dispatch('login', user)
          .then(() => this.$router.push('/home'))
          .catch(err => console.log(err));

        }).catch((err) => {
          // Handle Errors here.
          var errorCode = error.code;
          var errorMessage = error.message;
          // The email of the user's account used.
          var email = error.email;
          // The firebase.auth.AuthCredential type that was used.
          var credential = error.credential;

          alert('Oops. ' + err.message)
        });
      }
    }
  }
</script>

<style scoped>  /* "scoped" attribute limit the CSS to this component only */
  .login {
    margin-top: 40px;
  }
  input {
    margin: 10px 0;
    padding: 15px;
  }
  button {
    margin-top: 20px;
    cursor: pointer;
  }
  p {
    margin-top: 40px;
    font-size: 13px;
  }
  p a {
    text-decoration: underline;
    cursor: pointer;
  }
  .center{
    margin-left: auto; margin-right: auto; max-width:200px;
  }
  .social-button {
    width: 50px;
    background: white;
    padding: 10px;
    border-radius: 100%;
    box-shadow: 0 2px 4px 0 rgba(0,0,0,0.2);
    outline: 0;
    border: 0;
  }
  .social-button:active {
    box-shadow: 0 2px 4px 0 rgba(0,0,0,0.1);
  }
  .social-button img {
    width: 25%;
  }

</style>
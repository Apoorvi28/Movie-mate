import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Send POST request to backend to create a new user
      const response = await axios.post('http://localhost:4000/api/auth/signup', { email, password });


      // Store JWT token in localStorage
      localStorage.setItem('token', response.data.token);

      // Redirect to home page after successful signup
      navigate('/');
    } catch (err) {
      // Handle errors from backend (e.g., user already exists, invalid input)
      setError(err.response?.data?.msg || 'Something went wrong during signup');
    }
  };

  return (
    <div>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <button type="submit">Sign Up</button>
        </div>
      </form>

      {/* Show error message if there's any issue during signup */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default SignUp;

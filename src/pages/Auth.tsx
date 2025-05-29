import React from 'react';
import AuthForm from '../components/AuthForm';

const Auth: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <AuthForm />
    </div>
  );
};

export default Auth;
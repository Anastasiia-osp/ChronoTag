import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

const AuthForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signupCooldown, setSignupCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (signupCooldown && cooldownTime > 0) {
      interval = setInterval(() => {
        setCooldownTime((prev) => {
          if (prev <= 1) {
            setSignupCooldown(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [signupCooldown, cooldownTime]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const validateForm = () => {
    if (!email || !password) {
      toast.error('Пожалуйста, заполните все поля');
      return false;
    }

    if (!validateEmail(email)) {
      toast.error('Пожалуйста, введите корректный email адрес');
      return false;
    }

    if (!validatePassword(password)) {
      toast.error('Пароль должен состоять не менее чем из 6 символов');
      return false;
    }

    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('email_not_confirmed')) {
          toast.error(
            'Пожалуйста, подтвердите ваш email адрес перед входом. Проверьте почту для подтверждения.',
            { autoClose: 6000 }
          );
        } else {
          toast.error('Неверный email или пароль');
        }
      } else {
        navigate('/map');
      }
    } catch (error) {
      toast.error('Произошла ошибка. Пожалуйста, попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || signupCooldown) return;
    
    setIsLoading(true);
    try {
      const { error } = await signUp(email, password);
      if (error) {
        if (error.message.includes('rate_limit')) {
          setSignupCooldown(true);
          setCooldownTime(30); // 30 seconds cooldown
          toast.error('Пожалуйста, подождите 30 секунд перед следующей попыткой');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success(
          'Регистрация успешна! Пожалуйста, проверьте почту для подтверждения аккаунта.',
          { autoClose: 6000 }
        );
        setSignupCooldown(true);
        setCooldownTime(30);
      }
    } catch (error) {
      toast.error('Произошла ошибка. Пожалуйста, попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg animate-fade-in">
      <div className="flex justify-center mb-6">
        <div className="flex items-center space-x-2">
          <Clock size={32} className="text-secondary" />
          <h1 className="text-3xl font-semibold text-secondary">ChronoTag</h1>
        </div>
      </div>
      
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="email@example.com"
            spellCheck="false"
            lang="en"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Пароль
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
              placeholder="••••••••"
              spellCheck="false"
              lang="en"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Пароль должен состоять не менее чем из 6 символов
          </p>
        </div>
        
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isLoading}
            className="flex-1 bg-primary text-secondary font-medium py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark disabled:opacity-50"
          >
            {isLoading ? 'Загрузка...' : 'Войти'}
          </button>
          <button
            type="button"
            onClick={handleSignUp}
            disabled={isLoading || signupCooldown}
            className="flex-1 bg-secondary text-white font-medium py-2 px-4 rounded-lg hover:bg-secondary-light transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50"
          >
            {isLoading ? 'Загрузка...' : signupCooldown ? `Подождите ${cooldownTime}с` : 'Зарегистрироваться'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AuthForm;
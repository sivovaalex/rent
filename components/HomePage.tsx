'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Zap, Users, Star, Shield, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

interface HomePageProps {
  onOpenAuth: (mode?: string) => void;
}

interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
}

interface CategoryItem {
  icon: ReactNode;
  name: string;
  items: number;
}

interface Testimonial {
  name: string;
  role: string;
  text: string;
  rating: number;
}

export default function HomePage({ onOpenAuth }: HomePageProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const features: Feature[] = [
    {
      icon: <Zap className="w-8 h-8 text-indigo-600" />,
      title: 'Простая аренда',
      description: 'Легко находите и арендуйте нужные вещи в вашем районе'
    },
    {
      icon: <Shield className="w-8 h-8 text-indigo-600" />,
      title: 'Безопасная платформа',
      description: 'Все пользователи проходят верификацию для вашей безопасности'
    },
    {
      icon: <Star className="w-8 h-8 text-indigo-600" />,
      title: 'Надежные отзывы',
      description: 'Оценивайте и читайте отзывы об аренде от других пользователей'
    },
    {
      icon: <Package className="w-8 h-8 text-indigo-600" />,
      title: 'Разнообразие категорий',
      description: 'Стрим-оборудование, электроника, одежда, спорт, инструменты и многое другое'
    }
  ];

  const categories: CategoryItem[] = [
    { icon: <Zap className="w-6 h-6" />, name: 'Стрим-оборудование', items: 45 },
    { icon: <Users className="w-6 h-6" />, name: 'Электроника', items: 78 },
    { icon: <Package className="w-6 h-6" />, name: 'Одежда', items: 32 },
    { icon: <Star className="w-6 h-6" />, name: 'Спорт', items: 56 },
    { icon: <Shield className="w-6 h-6" />, name: 'Инструменты', items: 67 }
  ];

  const testimonials: Testimonial[] = [
    {
      name: 'Алексей С.',
      role: 'Стример',
      text: 'Нашел отличный микрофон для стримов по очень выгодной цене. Хозяин был очень внимательным и все подробно объяснил.',
      rating: 5
    },
    {
      name: 'Мария К.',
      role: 'Предприниматель',
      text: 'Арендовала профессиональную камеру для съемки продукта. Все прошло гладко, вернула в том же состоянии.',
      rating: 5
    },
    {
      name: 'Дмитрий П.',
      role: 'Студент',
      text: 'Снял горные лыжи на выходные для поездки в горы. Отличное качество и сервис!',
      rating: 4
    }
  ];

  if (!isClient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Package className="w-16 h-16 text-indigo-600" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-6">
            Аренда PRO
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Единая платформа для аренды и сдачи в аренду вещей. Надежно, удобно, выгодно.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              size="lg"
              className="px-8 py-6 text-lg font-medium bg-indigo-600 hover:bg-indigo-700"
              onClick={() => onOpenAuth('login')}
            >
              Начать арендовать
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 py-6 text-lg font-medium border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              onClick={() => onOpenAuth('register')}
            >
              Стать арендодателем
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Почему выбирают нас</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Мы создали максимально удобную и безопасную платформу для аренды вещей
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 border-gray-100 hover:border-indigo-200 transition-all duration-300">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="mb-4 p-3 bg-indigo-100 rounded-full">
                    {feature.icon}
                  </div>
                  {feature.title && (
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                  )}
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Популярные категории</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Выберите категорию и найдите именно то, что вам нужно
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {categories.map((category, index) => (
              <Card
                key={index}
                className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-gray-100 hover:border-indigo-200"
                onClick={() => {
                  router.push('/');
                }}
              >
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="mb-4 p-3 bg-indigo-100 rounded-full">
                    {category.icon}
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{category.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Отзывы пользователей</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Реальные отзывы от наших пользователей
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-2 border-gray-100">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${i < testimonial.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 italic mb-6">&quot;{testimonial.text}&quot;</p>
                  <div>
                    <p className="font-bold text-lg text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-indigo-600">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 to-purple-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Готовы начать арендовать или сдавать вещи?
          </h2>
          <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">
            Присоединяйтесь к тысячам довольных пользователей нашей платформы уже сегодня
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              size="lg"
              className="px-8 py-6 text-lg font-medium bg-white text-indigo-600 hover:bg-indigo-50"
              onClick={() => onOpenAuth('login')}
            >
              Войти в аккаунт
            </Button>
            <Button
              size="lg"
              className="px-8 py-6 text-lg font-medium border-white text-white hover:bg-white/10"
              onClick={() => onOpenAuth('register')}
            >
              Зарегистрироваться
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <Package className="w-8 h-8 text-indigo-400" />
              <span className="ml-2 text-2xl font-bold">Аренда PRO</span>
            </div>
            <p className="text-gray-400">
              Лучшая платформа для аренды и сдачи вещей в вашем городе
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Категории</h3>
            <ul className="space-y-2 text-gray-400">
              <li>Стрим-оборудование</li>
              <li>Электроника</li>
              <li>Одежда</li>
              <li>Спорт</li>
              <li>Инструменты</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Помощь</h3>
            <ul className="space-y-2 text-gray-400">
              <li>Как арендовать</li>
              <li>Как сдать в аренду</li>
              <li>Безопасность</li>
              <li>Поддержка</li>
              <li>Вопросы и ответы</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Контакты</h3>
            <ul className="space-y-2 text-gray-400">
              <li>support@arendapro.ru</li>
              <li>+7 (495) 123-45-67</li>
              <li>г. Москва, ул. Тверская, 1</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm">
          © 2026 Аренда PRO. Все права защищены.
        </div>
      </footer>
    </div>
  );
}

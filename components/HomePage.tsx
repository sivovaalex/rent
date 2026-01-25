'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Zap, Users, Star, Shield, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import Footer from '@/components/Footer';

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
      <section className="py-12 sm:py-20 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center">
          <div className="flex justify-center mb-4 sm:mb-6">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-4 sm:mb-6">
            Аренда PRO
          </h1>
          <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto mb-6 sm:mb-10 px-2">
            Единая платформа для аренды и сдачи в аренду вещей. Надежно, удобно, выгодно.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-2">
            <Button
              size="lg"
              className="px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-medium bg-indigo-600 hover:bg-indigo-700"
              onClick={() => onOpenAuth('login')}
            >
              Начать арендовать
              <ChevronRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-medium border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              onClick={() => onOpenAuth('register')}
            >
              Стать арендодателем
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 sm:py-16 px-3 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Почему выбирают нас</h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto px-2">
              Мы создали удобную и безопасную платформу для аренды вещей
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 border-gray-100 hover:border-indigo-200 transition-all duration-300">
                <CardContent className="p-3 sm:p-6 flex flex-col items-center text-center">
                  <div className="mb-2 sm:mb-4 p-2 sm:p-3 bg-indigo-100 rounded-full">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 [&>svg]:w-full [&>svg]:h-full">
                      {feature.icon}
                    </div>
                  </div>
                  {feature.title && (
                    <h3 className="text-sm sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{feature.title}</h3>
                  )}
                  <p className="text-xs sm:text-base text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-10 sm:py-16 px-3 sm:px-6 lg:px-8 bg-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Популярные категории</h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto px-2">
              Выберите категорию и найдите именно то, что вам нужно
            </p>
          </div>

          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-6 max-w-5xl mx-auto">
            {categories.map((category, index) => (
              <Card
                key={index}
                className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-gray-100 hover:border-indigo-200"
                onClick={() => {
                  router.push('/');
                }}
              >
                <CardContent className="p-3 sm:p-6 flex flex-col items-center text-center">
                  <div className="mb-2 sm:mb-4 p-2 sm:p-3 bg-indigo-100 rounded-full">
                    {category.icon}
                  </div>
                  <h3 className="font-bold text-xs sm:text-lg text-gray-900">{category.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-10 sm:py-16 px-3 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Отзывы пользователей</h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto px-2">
              Реальные отзывы от наших пользователей
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-2 border-gray-100">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center mb-3 sm:mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${i < testimonial.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 italic mb-4 sm:mb-6">&quot;{testimonial.text}&quot;</p>
                  <div>
                    <p className="font-bold text-base sm:text-lg text-gray-900">{testimonial.name}</p>
                    <p className="text-xs sm:text-sm text-indigo-600">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 px-3 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 to-purple-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6 px-2">
            Готовы начать арендовать или сдавать вещи?
          </h2>
          <p className="text-base sm:text-xl text-indigo-100 mb-6 sm:mb-10 max-w-2xl mx-auto px-2">
            Присоединяйтесь к тысячам довольных пользователей нашей платформы
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-2">
            <Button
              size="lg"
              className="px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-medium bg-white text-indigo-600 hover:bg-indigo-50"
              onClick={() => onOpenAuth('login')}
            >
              Войти в аккаунт
            </Button>
            <Button
              size="lg"
              className="px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-medium border-white text-white hover:bg-white/10"
              onClick={() => onOpenAuth('register')}
            >
              Зарегистрироваться
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

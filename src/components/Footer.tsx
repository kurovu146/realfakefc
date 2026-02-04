export default function Footer() {
  return (
    <footer className="bg-pl-purple text-white py-12 mt-20 border-t-8 border-pl-pink">
      <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-2xl mb-4 text-pl-green">RealFake FC</h3>
          <p className="text-sm opacity-80">
            Thổi bùng ngọn lửa đam mê! 🔥 🔥 🔥
          </p>
        </div>
        <div>
          <h4 className="text-xl mb-4">Câu lạc bộ</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li>
              <a href="#" className="hover:text-pl-green">
                Lịch sử
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-pl-green">
                Sân vận động
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-pl-green">
                Liên hệ
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-xl mb-4">Tin tức</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li>
              <a href="#" className="hover:text-pl-green">
                Mới nhất
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-pl-green">
                Chuyển nhượng
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-pl-green">
                Học viện
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-xl mb-4">Mạng xã hội</h4>
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-pl-pink cursor-pointer transition-colors">
              FB
            </div>
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-pl-pink cursor-pointer transition-colors">
              X
            </div>
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-pl-pink cursor-pointer transition-colors">
              IG
            </div>
          </div>
        </div>
      </div>
      <div className="text-center mt-12 pt-8 border-t border-white/10 text-sm opacity-60">
        &copy; 2026 RealFake FC. Đã đăng ký bản quyền.{" "}
      </div>
    </footer>
  );
}

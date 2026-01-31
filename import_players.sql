-- SQL Script to import official RealFake FC Players
-- Bạn hãy copy và chạy lệnh này trong Supabase SQL Editor

INSERT INTO players (name, number, position, image, nickname) VALUES
('Nguyễn Dũng', 0, 'Manager', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dung', 'Sếp Dũng'),
('Thành Quý', 1, 'Goalkeeper', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Quy', 'Quý Gôn'),
('Trọng Cường', 4, 'Defender', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cuong', 'Cường Đá'),
('Ngô Anh Tuấn', 2, 'Defender', 'https://api.dicebear.com/7.x/avataaars/svg?seed=TuanAnh', 'Tuấn Ngô'),
('Lê Đặng Hùng', 5, 'Defender', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hung', 'Hùng Lê'),
('Đào Hải Đăng', 8, 'Midfielder', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dang', 'Đăng Đào'),
('Vũ Đức Anh', 6, 'Midfielder', 'https://api.dicebear.com/7.x/avataaars/svg?seed=DucAnh', 'Anh Vũ'),
('Vũ Đức Tuấn', 9, 'Forward', 'https://api.dicebear.com/7.x/avataaars/svg?seed=DucTuan', 'Tuấn Vũ'),
('Hồ Quyết Tiến', 10, 'Forward', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tien', 'Tiến Hồ'),
('Nguyễn Đức Trung', 11, 'Midfielder', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Trung', 'Trung Nguyễn'),
('Nguyên Vũ Duy', 7, 'Midfielder', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Duy', 'Duy Vũ'),
('Vũ Tuấn Minh', 3, 'Defender', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Minh', 'Minh Vũ');

# Coolab API

Bu qovluq Coolab School-un şəxsi kabineti üçün backend-dir. Mövcud ana səhifə statik qalır; backend ayrıca işləyir və sonradan portal ilə birləşəcək.

## Visual Studio Code-da açmaq

1. `D:\Coolab School` qovluğunu VS Code-da açın.
2. Soldakı Explorer panelində `apps/api` qovluğunu açın.
3. Terminalı açın və bu qovluğa keçin:

```powershell
cd apps/api
```

4. İlk dəfə paketləri quraşdırın:

```powershell
pnpm install
```

5. Nümunə mühit faylını kopyalayın:

```powershell
Copy-Item .env.example .env
```

6. Lokal serveri başladın:

```powershell
pnpm dev
```

Server `http://localhost:4000` ünvanında işləyəcək. Yoxlama ünvanı: `http://localhost:4000/api/v1/health`.

## Hazır olan başlanğıc

- Express və TypeScript API skeleti;
- təhlükəsizlik başlıqları, CORS və vahid xəta cavabları;
- `GET /api/v1/health` endpointi;
- `POST /api/v1/auth/sign-up` endpointi;
- Supabase üçün mühit dəyişənləri;
- valideyn, şagird, mentor, qrup, dərs, ödəniş və oyun irəliləyişi üçün ilkin SQL modeli.

## Növbəti addım

Supabase layihəsi yaradıldıqdan sonra onun `Project URL` və `anon key` dəyərlərini yalnız `apps/api/.env` faylına əlavə edəcəyik. `SUPABASE_SERVICE_ROLE_KEY` yalnız backend üçündür və heç vaxt frontend koduna əlavə edilmir.

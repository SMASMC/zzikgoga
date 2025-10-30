INSERT INTO public.companion (id, name, created_at, updated_at) VALUES
                                                                    (1,'연인·배우자', now(), now()),
                                                                    (2,'친구',       now(), now()),
                                                                    (3,'지인·동료',  now(), now()),
                                                                    (4,'혼자',       now(), now()),
                                                                    (5,'아이',       now(), now()),
                                                                    (6,'부모님',     now(), now()),
                                                                    (7,'기타',       now(), now())
    ON CONFLICT (id) DO UPDATE
                            SET name = EXCLUDED.name,
                            updated_at = now();

INSERT INTO public.thema (id, name, created_at, updated_at) VALUES
                                                                (1,'카페투어',     now(), now()),
                                                                (2,'도심 속 휴식', now(), now()),
                                                                (3,'드라이브',     now(), now()),
                                                                (4,'감성',         now(), now()),
                                                                (5,'먹방',         now(), now()),
                                                                (6,'캠핑',         now(), now()),
                                                                (7,'야경',         now(), now()),
                                                                (8,'힐링',         now(), now()),
                                                                (9,'축제',         now(), now()),
                                                                (10,'기념일',      now(), now())
    ON CONFLICT (id) DO UPDATE
                            SET name = EXCLUDED.name,
                            updated_at = now();

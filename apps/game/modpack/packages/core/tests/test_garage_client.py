# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.client.garage import run_in_order, run_processor


def adisp_async(func):
    def wrapper(*args, **kwargs):
        def caller(callback):
            kwargs['callback'] = callback
            func(*args, **kwargs)
        return caller
    return wrapper


class Result(object):

    def __init__(self, success):
        self.success = success
        self.userMsg = ''


class Processor(object):

    def __init__(self, success=True):
        self.success = success
        self.sent = 0

    @adisp_async
    def request(self, callback=None):
        self.sent += 1
        callback(Result(self.success))


class RunProcessorTest(unittest.TestCase):

    def test_the_request_goes_out_once(self):
        processor = Processor()

        run_processor(lambda: processor, lambda success: None, 'test')

        assert processor.sent == 1

    def test_a_granted_request_answers_success_once(self):
        answers = []

        run_processor(lambda: Processor(), answers.append, 'test')

        assert answers == [True]

    def test_a_refused_request_reports_failure(self):
        answers = []

        run_processor(lambda: Processor(success=False), answers.append, 'test')

        assert answers == [False]


class RunInOrderTest(unittest.TestCase):

    def test_every_step_sends_its_request_skipping_empty_steps(self):
        first = Processor()
        second = Processor()

        run_in_order([lambda: first, lambda: None, lambda: second], lambda success: None, 'test')

        assert first.sent == 1
        assert second.sent == 1

    def test_the_whole_run_answers_success_once(self):
        answers = []

        run_in_order([lambda: Processor(), lambda: None, lambda: Processor()], answers.append, 'test')

        assert answers == [True]


if __name__ == '__main__':
    unittest.main()
